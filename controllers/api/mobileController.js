const {
  unlinkSingleImage,
  unlinkMultipleImages,
  getImageWithFoldername,
  getImageWithFolder,
} = require("../../services/FileService");
const moment = require("moment");
const admin = require("firebase-admin");
module.exports = {
  getTodoOfbyTeamId: (req, res) => {
    try {
      const teamId = req.body.teamid;

      const fromdate = req.body.from_date;
      const todate = req.body.to_date;
      const status = req.body.status;
      const file_id = req.body.file_id;
      if (!teamId) {
        res
          .status(400)
          .json({ message: "Team ID is missing", error: true, data: [] });
        return;
      }

      var where = " `t`.`team_id`=" + teamId;
      if (fromdate && todate) {
        where +=
          " and `t`.`execution_date` between '" +
          fromdate +
          "' and '" +
          todate +
          "'";
      }
      if (status) {
        where += " and `t`.`mark_as_done`=" + status;
      }
      if (file_id) {
        where += " and `t`.`mst_file_id`=" + file_id;
      }

      var sql =
        "SELECT `t`.`id`,`t`.`title`,`t`.`description`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,DATE_FORMAT(`t`.`execution_date`,'%d %b %Y') as execution_date,DATE_FORMAT(`t`.`completed_date`,'%d %b %Y') as completed_date,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id` WHERE `t`.`is_deleted`=0 and " +
        where +
        " order by `t`.`mark_as_done` asc";
      // ,`t`.`execution_date` asc"
      db.query(sql, [teamId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: [] });
        } else if (result.length > 0) {
          result = result.map((item) => ({
            ...item,
            card: JSON.parse(item.card || "[]"),
          }));
          res
            .status(200)
            .json({ message: "Records fetched", error: false, data: result });
        } else {
          res
            .status(404)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getLeaveByIdForTeam: (req, res) => {
    const id = req.body.id;

    var sql =
      "SELECT `t`.`id`,`t`.`team_id`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `fullname`,`t`.`title`,`t`.`description`, DATE_FORMAT(`t`.`from_date`, '%d-%M-%Y') AS `formatted_from_date` ,DATE_FORMAT(`t`.`to_date`, '%d-%M-%Y') AS `formatted_to_date`,`t`.`status`,DATE_FORMAT(`t`.`created_at`, '%d-%M-%Y') AS `created_at` FROM `team_leave` as `t` LEFT JOIN `users` as `u` ON `u`.`id`=`t`.`team_id` where `team_id`=" +
      id +
      "  and `is_deleted`=0 order by `created_at` desc";

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  viewbyFileExpenseOfTeam: (req, res) => {
    try {
      const id = req.body.id;
      // const id = 50;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id`  WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
          module.exports.FILE_EXPENSE +
          " and `de`.`team_id`=" +
          id +
          "";
        var sql2 =
          "SELECT sum(`amount`) as `total_deposit` FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.DEPOSIT +
          "";
        var sql3 =
          "SELECT (SELECT sum(`amount`) FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.DEPOSIT +
          ")-(SELECT sum(`amount`) FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.FILE_EXPENSE +
          ") as `total_amount`";
        // var sql4 = "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`="+id+" and `isdeleted`=0 and `expense_type`="+module.exports.FILE_EXPENSE+"";
        var sql4 =
          "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type` in (" +
          module.exports.FILE_EXPENSE +
          "," +
          module.exports.OFFICE_EXPENSE +
          ")";
        db.query(`${sql};${sql2};${sql3};${sql4}`, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: [] });
          }
          // else if(result.length>0)
          // {
          //     res.status(200).json({error:false,message:"Record fetched",data:result[0],amount:result[1][0]?.amount});
          // }
          else {
            const total_deposit = result[1][0]?.total_deposit
              ? result[1][0]?.total_deposit
              : 0;
            const total_expense = result[3][0]?.total_expense
              ? result[3][0]?.total_expense
              : 0;
            var final_total_amount = total_deposit - total_expense;
            res.status(200).json({
              error: false,
              message: "Record fetched",
              data: result[0],
              total_deposit: result[1][0]?.total_deposit,
              amount: result[2][0]?.total_amount,
              final_total_amount: final_total_amount,
            });
          }
        });
      } else {
        module.exports.errorStatus(res, 200, "Invalid request", true);
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },

  viewOfficeExpenseOfTeamapp: (req, res) => {
    try {
      const id = req.body.id;
      // const id = 50;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
          module.exports.OFFICE_EXPENSE +
          " and `de`.`team_id`=" +
          id +
          "";
        var sql2 =
          "SELECT sum(`amount`) as `total_deposit` FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.DEPOSIT +
          "";
        var sql3 =
          "SELECT (SELECT sum(`amount`) FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.DEPOSIT +
          ")-(SELECT sum(`amount`) FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type`=" +
          module.exports.OFFICE_EXPENSE +
          ") as `total_amount`";
        // var sql4 = "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`="+id+" and `isdeleted`=0 and `expense_type`="+module.exports.OFFICE_EXPENSE+"";
        var sql4 =
          "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`=" +
          id +
          " and `isdeleted`=0 and `expense_type` in (" +
          module.exports.FILE_EXPENSE +
          "," +
          module.exports.OFFICE_EXPENSE +
          ")";

        db.query(`${sql};${sql2};${sql3};${sql4}`, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: [] });
          }
          // else if(result.length>0)
          // {
          //     res.status(200).json({error:false,message:"Record fetched",data:result[0],amount:result[1][0]?.amount});
          // }
          else {
            const total_deposit = result[1][0]?.total_deposit
              ? result[1][0]?.total_deposit
              : 0;
            const total_expense = result[3][0]?.total_expense
              ? result[3][0]?.total_expense
              : 0;
            var final_total_amount = total_deposit - total_expense;
            res.status(200).json({
              error: false,
              message: "Record fetched",
              data: result[0],
              total_deposit: result[1][0]?.total_deposit,
              amount: result[2][0]?.total_amount,
              final_total_amount: final_total_amount,
            });
          }
        });
      } else {
        module.exports.errorStatus(res, 200, "Invalid request", true);
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },

  getTodoID: (req, res) => {
    try {
      const id = req.body.id;

      if (isNaN(id)) {
        // Check if id is not a valid integer
        return res
          .status(400)
          .json({ message: "Invalid ID parameter", error: true, data: [] });
      }

      var sql =
        "SELECT `t`.`id`,`t`.`title`,`t`.`description`,`t`.`team_id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`t`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`t`.`remarks`,`t`.`execution_date`,`t`.`completed_date`,`t`.`extended_date`,`t`.`actual_completed_date`,`t`.`reason`,`t`.`work_done`,`t`.`work_pending`,`t`.`is_deleted`,`t`.`is_approved`,`t`.`approved_date`,`t`.`card`,`t`.`mark_as_done` FROM `todos` as `t` LEFT JOIN `users` as `u` on `u`.`id`=`t`.`team_id` LEFT JOIN `mst_file` as `mf` ON `t`.`mst_file_id`=`mf`.`id` WHERE `t`.`is_deleted`=0 and `t`.`id`=" +
        id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ message: "Record fetched", error: false, data: result });
        } else {
          res
            .status(404)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getbyDepositExpenseTeamId: (req, res) => {
    try {
      const team_id = req.body.id;
      console.log("team_id==>", team_id);

      var sql =
        "SELECT `de`.`id`,`de`.`receipt_image`, `u`.`first_name`, `u`.`last_name`, CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `team_fullname`, `de`.`description`, `expense_type`, `de`.`mst_file_id`, `mf`.`file_name`, `de`.`team_id`, `de`.`amount`,DATE_FORMAT(`de`.`date`, '%d-%M-%Y') AS `date`, `de`.`isdeleted`, `de`.`is_approved`, `de`.`created_by`, `de`.`created_at` FROM `deposit_expense` AS `de` LEFT JOIN `users` AS `u` ON `u`.`id` = `de`.`team_id` LEFT JOIN `mst_file` AS `mf` ON `mf`.`id` = `de`.`mst_file_id` WHERE `de`.`isdeleted` = 0 AND `de`.`team_id` = ?";

      var sql2 =
        "SELECT SUM(`amount`) AS `total_deposit` FROM `deposit_expense` WHERE `team_id` = ? AND `expense_type` <> 1";

      var sql3 =
        "SELECT SUM(`amount`) AS `total_expense` FROM `deposit_expense` WHERE `team_id` = ? AND `expense_type` <> 2";

      var sql4 =
        "SELECT CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `team_fullname` FROM `users` AS `u` WHERE `u`.`id` = ?";

      const query = `${sql}; ${sql2}; ${sql3}; ${sql4}`; // Add spaces between the queries

      const values = [team_id, team_id, team_id, team_id];
      console.log("Query values:", values);

      db.query(sql, [team_id], (err, result) => {
        console.log("Query 1 result:", result);
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          db.query(sql2, [team_id], (err, result2) => {
            console.log("Query 2 result:", result2);
            if (err) {
              res
                .status(200)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              db.query(sql3, [team_id], (err, result3) => {
                console.log("Query 3 result:", result3);
                if (err) {
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  db.query(sql4, [team_id], (err, result4) => {
                    console.log("Query 4 result:", result4);
                    if (err) {
                      res.status(200).json({
                        error: true,
                        message: err.sqlMessage,
                        data: {},
                      });
                    } else {
                      res.status(200).json({
                        error: false,
                        message: "Record Fetched",
                        data: result,
                        total_deposit: result2[0]?.total_deposit,
                        total_expense: result3[0]?.total_expense,
                        team_data: result4,
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },

  // getFileApp: async function (req, res) {
  //   const team_id = req?.body?.team_id;
  //   const id = req?.body?.id;
  //   var where = " `mf`.`isdeleted`=0";
  //   // var sql = "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id`  WHERE `mg`.`name`='Client' and `mf`.`isdeleted`=0";
  //   if (id) {
  //     where += " and `mf`.`id`=" + id;
  //   }

  //   if (team_id) {
  //     where += " and `mf`.`team_id`=" + team_id;
  //   }

  //   var sql =
  //     "SELECT `mf`.*,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`,`fd`.`ward_no`,`fd`.`cs_no`,`fd`.`rs_block_no_text`,`fd`.`tps_no`,`fd`.`fp_no` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` WHERE " +
  //     where;

  //   db.query(sql, function (err, result) {
  //     if (err) {
  //       res
  //         .status(201)
  //         .send({ error: true, message: err.sqlMessage, files: {} });
  //     } else {
  //       if (result.length > 0) {
  //         res
  //           .status(201)
  //           .send({ error: false, message: "Record fetched", files: result });
  //       } else {
  //         res
  //           .status(201)
  //           .send({ error: false, message: "Not found", files: [] });
  //       }
  //     }
  //   });
  // },

  deleteleaveforapp: (req, res) => {
    const id = req?.body?.id;

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

  addapp: function (req, res) {
    const requiredFields = [
      "mst_file_project_id",
      "client_id",
      "key_observation",
      "remarks",
      "site_incharge",
      "authorized_person",
      "review_by",
    ];

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const site = {
      mst_type_id: this_data.mst_type_id,
      mst_inspection_checklist_id: this_data.mst_inspection_checklist_id,
      others_text: this_data.others_text,
      mst_file_project_id: this_data.mst_file_project_id,
      client_id: this_data.client_id,
      key_observation: this_data.key_observation || "",
      remarks: this_data.remarks || "",
      site_incharge: this_data.site_incharge || "",
      authorized_person: this_data.authorized_person || "",
      review_by: this_data.review_by || "",
      created_by: user_id,
      client_sign: this_data.client_sign,
      review_by_sign: this_data.review_by_sign,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("site==>", site);

    db.query("INSERT INTO site_inspection SET ?", site, function (err, result) {
      if (err) {
        // Handle error and return response
        // unlinkMultipleImages(files);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      // If insertion is successful, you can send a success response here
      const data = {
        error: false,
        message: "Site inspection has been added successfully.",
        data: {
          id: result.insertId,
          // Include any other relevant data you want to send
        },
      };
      res.status(201).json(data);
    });
  },

  uploadapp: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }
    // Process uploaded files
    const files = [];
    let client_sign = "";
    // let review_by_sign = "";
    const unnecessary_files = [];

    req.files.forEach((file) => {
      if (file.fieldname === "client_sign") {
        client_sign = getImageWithFolder(file.path);
        files.push(client_sign);
      } else {
        // unlinkImage(file.path);
      }
    });
    console.log("ckient--->", client_sign);
    // console.log("authorized--->", review_by_sign);

    // Check for client signature
    if (!client_sign) {
      // Remove unnecessary files
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the client signature.",
        data: {},
      });
    }

    const site = {
      client_sign: client_sign,
      // review_by_sign: review_by_sign,
    };
    console.log("site==>", site);

    //   // If insertion is successful, you can send a success response here
    const data = {
      error: false,
      message: "upload image successfully.",
      data: client_sign,
    };
    res.status(201).json(data);
    // });
  },

  UpdateFileExpenseByTeam: function (req, res) {
    if (!req.files || req.files.length === 0) {
      console.log("req==>", req.files);
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }
    // Process uploaded files
    const files = [];
    let receipt_image = "";

    req.files.forEach((file) => {
      if (file.fieldname === "receipt_image") {
        receipt_image = getImageWithFoldername(file.path);
        files.push(receipt_image);
      } else {
        // unlinkImage(file.path);
      }
    });
    console.log("ckient--->", receipt_image);

    // Check for client signature
    if (!receipt_image) {
      // Remove unnecessary files
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the receipt image .",
        data: {},
      });
    }

    const site = {
      receipt_image: receipt_image,
    };
    console.log("site==>", site);

    const data = {
      error: false,
      message: "upload image successfully.",
      data: receipt_image,
    };
    res.status(201).json(data);
    // });
  },

  getConfig: (req, res) => {
    const category = [
      {
        id: "42",
        title: "Civil",
      },
      {
        id: "43",
        title: "Interior",
      },
    ];

    const banner = [
      {
        id: "1",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-1.png",
        display_order: "1",
      },
      {
        id: "2",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-2.png",
        display_order: "1",
      },
      {
        id: "3",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-3.png",
        display_order: "1",
      },
      {
        id: "4",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-4.png",
        display_order: "1",
      },
      {
        id: "5",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-5.png",
        display_order: "1",
      },
      {
        id: "6",
        title: "",
        image_path:
          "https://www.zaidexceldesign.com/public/img/home-banner-6.png",
        display_order: "1",
      },
    ];
    res.status(200).json({
      message: "Success",
      error: false,
      category: category,
      banner: banner,
    });
  },

  getInspectionbyCatID: (req, res) => {
    var id = parseInt(req.body.id);
    var sql =
      "SELECT * FROM `mst_inspection_checklist` WHERE `is_deleted`=0 and `status`=1  and mst_type_id=" +
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
  },

  uploadofficexpense: function (req, res) {
    if (!req.files || req.files.length === 0) {
      console.log("req--->", req.files);
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }
    // Process uploaded files
    const files = [];
    let receipt_image = "";
    // let review_by_sign = "";
    const unnecessary_files = [];

    req.files.forEach((file) => {
      if (file.fieldname === "receipt_image") {
        receipt_image = getImageWithFoldername(file.path);
        files.push(receipt_image);
      } else {
        unlinkImage(file.path);
      }
    });
    console.log("ckient--->", receipt_image);
    // console.log("authorized--->", review_by_sign);

    // Check for client signature
    if (!receipt_image) {
      // Remove unnecessary files
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the client signature.",
        data: {},
      });
    }

    const expense = {
      receipt_image: receipt_image,
      // review_by_sign: review_by_sign,
    };
    console.log("site==>", expense);

    const data = {
      error: false,
      message: "upload image successfully.",
      data: "office_expenses/" + receipt_image,
    };
    res.status(201).json(data);
    // });
  },

  getTotaltask: (req, res) => {
    try {
      const teamId = req.body.teamid;

      if (!teamId) {
        res
          .status(400)
          .json({ message: "Team ID is missing", error: true, data: {} });
        return;
      }

      var sql =
        "SELECT COUNT(id) as total, SUM(CASE WHEN mark_as_done = 1 THEN 1 ELSE 0 END) AS complete FROM todos WHERE is_deleted = 0 and team_id = ?";

      var sql2 = "SELECT COUNT(id) as files FROM mst_file WHERE isdeleted = 0";

      db.query(sql, [teamId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else {
          // Store the result of the first query
          const data = {
            total: result[0].total,
            complete: result[0].complete,
          };

          // Execute the second query
          db.query(sql2, (err, result2) => {
            if (err) {
              console.log(err);
              res
                .status(500)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              // Add the result of the second query to the data object
              data.files = result2[0].files;

              // Return the modified data object in the response
              res
                .status(200)
                .json({ message: "Records fetched", error: false, data });
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  addusertrack: function (req, res) {
    const this_data = req.body;

    const user = {
      user_id: this_data.user_id,
      track_data: this_data.track_data,
      created_at: getCurrentDateAndTime(),
    };

    db.query("INSERT INTO user_track SET ?", user, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      const data = {
        error: false,
        message: "user track has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  EmployeeGetAPPNotification: (req, res) => {
    try {
      const user = req?.body.user;
      console.log("user==>", user);

      var sql =
        "SELECT `id`, JSON_EXTRACT(`json_data`, '$.message') AS `message`,`child_id`,`table_name`,DATE_FORMAT(`created_at`, '%d-%M-%Y') as `created_at` FROM `notification` WHERE `is_seen` = 0 AND `assign_to` = " +
        user +
        " ORDER BY `created_at` DESC LIMIT 10";
      var sql2 =
        "SELECT msg,  DATE_FORMAT(created_at, '%d-%M-%Y') as created_at FROM firebase_notification WHERE user_id =" +
        user +
        " ORDER BY created_at DESC LIMIT 10";

      db.query(sql, (err, result1) => {
        if (err) {
          console.log(err);
          res.status(200).json({
            message: err.sqlMessage,
            error: true,
            data: {},
            response: "work",
          });
        } else {
          db.query(sql2, (err, result2) => {
            if (err) {
              console.log(err);
              res.status(200).json({
                message: err.sqlMessage,
                error: true,
                data: {},
                response: "general",
              });
            } else {
              res.status(200).json({
                message: "Records fetched",
                error: false,
                work: result1,
                general: result2,
              });
            }
          });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ error: true, message: "Something went wrong", data: {} });
    }
  },

  changeappPassword: function (req, res) {
    var current_password = req.body.current_password;
    var new_password = req.body.new_password;
    var confirm_password = req.body.confirm_password;
    jwt.verify(req.token, meta.thekey, (err, auth) => {
      if (err) {
        res.json({ message: err.message, error: true });
      } else {
        req.assert("current_password", "Current password required").notEmpty();
        req.assert("new_password", "New password required").notEmpty();
        req.assert("confirm_password", "Confirm password required").notEmpty();
        req
          .assert(
            "confirm_password",
            "Confirm password does not match new password",
          )
          .equals(new_password);
        var errors = req.validationErrors();
        if (errors) {
          var data = {
            error: true,
            message: errors[0].msg,
            data: new Object(),
          };
          res.status(201).send(data);
        } else {
          const user_id = req.user ? req.user.id : null;
          //get current user
          var sql = "SELECT * FROM `users` WHERE `id` ='" + user_id + "'";
          db.query(sql, function (err, result, fields) {
            if (err) {
              var data = {
                error: true,
                message: err.sqlMessage,
                data: new Object(),
              };
              res.status(201).send(data);
            } else {
              if (result.length > 0) {
                if (bcrypt.compareSync(current_password, result[0].password)) {
                  var salt = bcrypt.genSaltSync(10);
                  password = bcrypt.hashSync(new_password, salt);
                  var sql =
                    "UPDATE `users` SET `password`='" +
                    password +
                    "' WHERE `id`='" +
                    user_id +
                    "'";
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
                        message: messageClass.RESPONSE.PASSWORD_CHANGE_SUCCESS,
                        data: new Object(),
                      };
                      res.status(201).send(data);
                    }
                  });
                } else {
                  var data = {
                    error: true,
                    message: "Incorrect current password",
                    data: new Object(),
                  };
                  res.status(201).send(data);
                }
              } else {
                var data = {
                  error: true,
                  message: "Some thing went to wrong.",
                  data: new Object(),
                };
                res.status(201).send(data);
              }
            }
          });
        }
      }
    });
  },

  // customer side

  getCustomersites: (req, res) => {
    try {
      const id = req?.body.id;
      console.log("id==>", req.body);

      if (parseInt(id) != NaN) {
        var sql =
          // "select mst.id,mst.office_file_no, mst.code,mst.file_name,fs.ward_no,fs.rs_block_no_text,fs.ward_no,fs.cs_no,fs.tps_no,fs.fp_no from mst_file as mst left join file_details as fs on fs.mst_file_id = mst.id where mst.id = " + id+"";
          "SELECT  msc.title,  CONCAT(us.first_name, ' ', us.last_name) AS inspect, mst.type_name, CONCAT(u.first_name, ' ', u.last_name) AS client_name,  DATE_FORMAT(si.created_at, '%d-%M-%Y') as created_at,  si.is_deleted,mst_file.office_file_no,  mst_file.file_name,si.mst_file_project_id,si.types,si.mst_type_id,si.mst_inspection_checklist_id,si.others_text,si.key_observation,si.remarks,si.site_incharge,authorized_person,si.review_by,si.client_sign,si.review_by_sign,si.client_query,msc.title as visit_work, mfc.title as code_title,file_details.tps_no,file_details.ward_no,file_details.fp_no,file_details.cs_no,file_details.rs_block_no_text   FROM  site_inspection AS si  LEFT JOIN   mst_file ON mst_file.id = si.mst_file_project_id LEFT JOIN  file_details ON mst_file.id = file_details.mst_file_id  LEFT JOIN    users AS u ON u.id = si.client_id   LEFT JOIN   mst_type AS mst ON mst.id = si.mst_type_id  LEFT JOIN    users AS us ON us.id = si.review_by  LEFT JOIN   mst_inspection_checklist AS msc ON msc.id = si.mst_inspection_checklist_id   LEFT JOIN      mst_file_code as mfc ON mfc.id  = mst_file.code   WHERE  si.is_deleted = 0 AND si.client_id = " +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, sites: {} });
          } else if (result.length) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, sites: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, sites: [] });
          }
        });
      } else {
        res
          .status(200)
          .json({ message: "Invalid request", error: true, sites: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, sites: {} });
    }
  },
  getFileByClientId: (req, res) => {
    try {
      const cus_id = req.body?.id;

      // var sql =
      //   "SELECT `mf`.`id`,`mf`.`office_file_no`,`mf`.`file_name`,`mf`.`code`,`mfc`.`title` as `code_title`,`mf`.`dates`,`fd`.`tps_stage`,`ms`.`id` as `stage_title_id`,`ms`.`title` as `stage_title` from `mst_file` as `mf` LEFT JOIN `file_details` as `fd` ON `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code`  WHERE `cus_id`=" +
      //   cus_id +
      //   " and `mf`.`isdeleted`=0";

      var sql =
        "SELECT   `mf`.`id`,  `mf`.`office_file_no`,   `mf`.`file_name`,  `mf`.`code`,  `mfc`.`title` as `code_title`,   `mf`.`dates`,   `fd`.`tps_stage`,   `ms`.`id` as `stage_title_id`,  `ms`.`title` as `stage_title` FROM   `mst_file` as `mf` LEFT JOIN    `file_details` as `fd` ON `fd`.`mst_file_id` = `mf`.`id` LEFT JOIN     `mst_stage` as `ms` ON `ms`.`id` = `mf`.`mst_stage_id` LEFT JOIN   `mst_file_code` as `mfc` ON `mfc`.`id` = `mf`.`code` WHERE     `cus_id` =" +
        cus_id +
        " AND `mf`.`isdeleted` = 0;";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: "Database error", filesbyid: {}, error: true });
        } else if (result.length > 0) {
          res.status(200).json({
            message: "Record Fetched",
            filesbyid: result,
            error: false,
          });
        } else {
          res
            .status(200)
            .json({ message: "Not found", filesbyid: [], error: false });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Server error", filesbyid: {}, error: true });
    }
  },

  getProjectOfClientById: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`cus_id`=" +
        req.body?.id +
        "";

      console.log(sql);

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, projectbyid: [] });
        } else if (result.length > 0) {
          res.status(200).json({
            error: false,
            message: "Record fetched",
            projectbyid: result,
          });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", projectbyid: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res
        .status(200)
        .json({ message: "Server error", projectbyid: {}, error: true });
    }
  },

  getcustomersitesbyid: (req, res) => {
    try {
      const id = req.body?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select id,client_id,mst_file_project_id,types,mst_type_id,mst_inspection_checklist_id,others_text,key_observation,remarks,site_incharge,authorized_person,review_by,client_sign,review_by_sign,created_by,is_deleted, DATE_FORMAT(created_at, '%d-%M-%Y %H:%i:%s') as created_at from site_inspection   where is_deleted = 0   and id=" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res.status(200).json({
              message: err.sqlMessage,
              error: true,
              customersitesbyid: {},
            });
          } else if (result.length) {
            res.status(200).json({
              message: "Record fetched",
              error: false,
              customersitesbyid: result,
            });
          } else {
            res.status(200).json({
              message: "Not found",
              error: false,
              customersitesbyid: [],
            });
          }
        });
      } else {
        res.status(200).json({
          message: "Invalid request",
          error: true,
          customersitesbyid: {},
        });
      }
    } catch (err) {
      res.status(200).json({
        message: "Invalid request",
        error: true,
        customersitesbyid: {},
      });
    }
  },

  // file details
  getFileDetails: (req, res) => {
    try {
      const mst_file_id = req?.body?.id;

      var sql =
        "SELECT *from `file_details` where `mst_file_id`=" +
        Number(mst_file_id) +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res.status(201).json({
            error: true,
            message: "Something went wrong...",
            filedetails: [],
          });
        } else {
          if (result?.length) {
            res.status(201).json({
              error: false,
              message: "Record fetched...",
              filedetails: result,
            });
          } else {
            res.status(201).json({
              error: false,
              message: "No record found",
              filedetails: [],
            });
          }
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Server error", filedetails: {}, error: true });
    }
  },

  getDocumentUpload: (req, res) => {
    try {
      const mst_file_id = parseInt(req.body.id);
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

  getFS_IC_AminetiesFees: (req, res) => {
    try {
      var sql =
        "SELECT `fas`.`id`, `fas`.`mst_company_id`, `fas`.`mst_file_id`, `fas`.`amount`, `fas`.`emi`, `fas`.`emi_data`, `fas`.`is_type`, `fas`.`is_save`,`mf`.`file_name` FROM `file_aminities_fees` AS `fas` LEFT JOIN `mst_file` AS `mf` ON `mf`.`id` = `fas`.`mst_file_id` WHERE `fas`.`mst_file_id`=" +
        req.body?.id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, ameineties: {} });
        } else {
          result.forEach((item) => {
            item.emi_data = JSON.parse(item.emi_data);
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            ameineties: result,
          });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ error: true, message: "Server error", ameineties: {} });
    }
  },

  getRequiredDocumentList: (req, res) => {
    try {
      const id = req.body.id;
      var sql =
        "SELECT `mf`.`file_document_json`,`mf`.`is_save`,`md`.`types`,`md`.`doc_name` FROM `mst_file` as `mf` LEFT JOIN JSON_TABLE(`mf`.`file_document_json`,'$[*]' COLUMNS (`mst_document_id` INT PATH '$.mst_document_id')) AS `json_tab` ON 1=1 LEFT JOIN `mst_document` as `md` ON `md`.`id` = `json_tab`.`mst_document_id` WHERE `mf`.`id` = " +
        id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, requiredoc: {} });
        } else if (result.length) {
          const documentInfo = result.map((row) => ({
            mst_document_id: row.mst_document_id,
            doc_name: row.doc_name,
            types: row.types,
          }));

          res.status(201).json({
            error: false,
            message: "Record fetched",
            requiredoc: documentInfo,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Record not found...",
            requiredoc: {},
          });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Server error", requiredoc: {}, error: true });
    }
  },

  getTotal: (req, res) => {
    try {
      const client_id = req.body.id;

      if (!client_id) {
        res
          .status(400)
          .json({ message: "client ID is missing", error: true, data: {} });
        return;
      }

      var sql =
        "SELECT COUNT(`mf`.`id`) AS total_projects FROM `mst_file` AS `mf` LEFT JOIN `status_file` AS `sf2` ON `sf2`.`id` = `mf`.`category`  WHERE `mf`.`isdeleted` = 0 AND LCASE(`sf2`.`status_file_name`) = LCASE('Project')and `mf`.`cus_id`= ?";

      var sql2 =
        "SELECT COUNT(*) as files FROM mst_file WHERE cus_id = ? AND isdeleted = 0";

      db.query(sql, [client_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else {
          // Store the result of the first query
          const data = {
            projects: result[0].total_projects,
          };

          // Execute the second query
          db.query(sql2, [client_id], (err, result2) => {
            if (err) {
              console.log(err);
              res
                .status(500)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              // Add the result of the second query to the data object
              data.files = result2[0].files;

              // Return the modified data object in the response
              res
                .status(200)
                .json({ message: "Records fetched", error: false, data });
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        error: true,
        message: "Server API error: Something went wrong",
        data: {},
      });
    }
  },

  getcustomerfileData: (req, res) => {
    try {
      const id = req.body?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select mst.id,mst.office_file_no, mst.code,mst.file_name,fs.ward_no,fs.rs_block_no_text,fs.ward_no,fs.cs_no,fs.tps_no,fs.fp_no from mst_file as mst left join file_details as fs on fs.mst_file_id = mst.id where mst.id = " +
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

  getFilesname: (req, res) => {
    const filename = [
      {
        id: "1",
        title: "File Details",
      },
      {
        id: "2",
        title: "Required Document List",
      },
      {
        id: "3",
        title: "Document Upload(pdf)",
      },
      {
        id: "4",
        title: "F.S./I.C. - Amineties Fees",
      },
      {
        id: "5",
        title: "Fees List",
      },

      // {
      //   id: "3",
      //   title: "Plot validation certificate",
      // },
      // {
      //   id: "4",
      //   title: "E-Nagar Portal",
      // },
      // {
      //   id: "5",
      //   title: "Owner Portal",
      // },
      // {
      //   id: "8",
      //   title: "Road Deposit/Scrunity Fees",
      // },
      // {
      //   id: "9",
      //   title: "All Important Fees",
      // },
      // {
      //   id: "11",
      //   title: "Work Fee",
      // },
      // {
      //   id: "12",
      //   title: "Approved plan",
      // },
    ];

    res.status(200).json({
      message: "Success",
      error: false,
      filename: filename,
    });
  },

  getfees: (req, res) => {
    try {
      const keyword = "road_scrunity";
      const mst_file_id = parseInt(req.body?.id);

      var sql =
        "SELECT  `frs`.`id`, `frs`.`amount`,   `frs`.`is_active`, `mt`.`type_name` AS `description`, `frs`.`documents`,   `frs`.`document_upload_date`, `frs`.`documents` AS `file`,    NULL AS `date`,   'file_road_scrunity' AS `source` FROM   `file_road_scrunity` AS `frs` LEFT JOIN   `mst_type` AS `mt` ON `mt`.`id` = `frs`.`mst_type_id` WHERE `frs`.`is_rejected` = 0  AND `frs`.`mst_file_id` = " +
        mst_file_id +
        "    AND `frs`.`show_website` = 1   UNION   SELECT  `id`,   `amount`,  NULL AS `is_active`, `description`, NULL AS `documents`,   NULL AS `document_upload_date`, `file`,   `date`, 'all_important_fees' AS `source`   FROM   `all_important_fees`   WHERE `mst_file_id` = " +
        mst_file_id +
        "  AND `show_website` = 1 ";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res.status(200).json({
            message: "An error occurred, Please contact the admin",
            error: true,
            data: [],
          });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ message: "Record fetched", data: result, error: false });
        } else {
          res
            .status(200)
            .json({ message: "Record fetched", data: [], error: false });
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  getfeesTotalamount: (req, res) => {
    try {
      const keyword = "road_scrunity";
      const mst_file_id = parseInt(req.body?.id);

      var sql =
        "SELECT `source`, SUM(`amount`) AS `total_amount` FROM ( SELECT `frs`.`amount`, 'file_road_scrunity' AS `source` FROM `file_road_scrunity` AS `frs` LEFT JOIN  `mst_type` AS `mt` ON `mt`.`id` = `frs`.`mst_type_id` WHERE `frs`.`is_rejected` = 0  AND `frs`.`mst_file_id`  = " +
        mst_file_id +
        " AND `frs`.`show_website` = 1 UNION SELECT  `amount`,  'all_important_fees' AS `source` FROM `all_important_fees` WHERE `mst_file_id` = " +
        mst_file_id +
        " AND `show_website` = 1) AS `combined_data` GROUP BY `source`";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res.status(200).json({
            message: "An error occurred, Please contact the admin",
            error: true,
            data: [],
          });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ message: "Record fetched", data: result, error: false });
        } else {
          res
            .status(200)
            .json({ message: "Record fetched", data: [], error: false });
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  clientNotification: (req, res) => {
    try {
      const client_id = req?.body.client_id;
      console.log("user==>", client_id);

      var sql =
        "SELECT `id`, `json_data`, `child_id`, `table_name`, DATE_FORMAT(`created_at`, '%d-%M-%Y') as `created_at` FROM `notification` WHERE `is_seen` = 0 AND `client_id` = " +
        client_id +
        " ORDER BY `created_at` DESC LIMIT 10";

      db.query(sql, (err, result1) => {
        if (err) {
          console.log(err);
          res.status(200).json({
            message: "An error occurred. Please contact the admin.",
            error: true,
            data: [],
            response: "work",
          });
        } else if (result1.length > 0) {
          const formattedResult = result1.map((item) => {
            const message = JSON.parse(item.json_data).message;
            const action = JSON.parse(item.json_data).action;
            return {
              id: item.id,
              message: message,
              child_id: item.child_id,
              action: action,
              table_name: item.table_name,
              created_at: item.created_at,
            };
          });

          res.status(200).json({
            message: "Record fetched",
            error: false,
            data: formattedResult,
            response: "work",
          });
        } else {
          res.status(200).json({
            message: "No notifications found",
            error: false,
            data: [],
            response: "work",
          });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ error: true, message: "Something went wrong", data: {} });
    }
  },

  addAttendance: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    const currentDate = this_data.date;

    // // Step 1: Check if today's task(s) exist and total 8 hours
    // const checkTodoSql = `SELECT id, hours FROM todos WHERE assign_to = ? AND date = ? AND is_deleted = 0`;

    // db.query(checkTodoSql, [user_id, currentDate], (todoErr, todoResults) => {
    //   if (todoErr) {
    //     return res
    //       .status(500)
    //       .json({ error: true, message: todoErr.sqlMessage, data: {} });
    //   }

    //   const taskExistsFlag = todoResults.length > 0 ? 0 : 1; // 0 = task exists, 1 = no task

    //   if (todoResults.length === 0) {
    //     return res.status(400).json({
    //       error: false,
    //       message: "Please add task of 8 hour then check in.",
    //       data: { task_exists: taskExistsFlag },
    //     });
    //   }

    //   const totalTaskHours = todoResults.reduce(
    //     (sum, row) => sum + Number(row.hours || 0),
    //     0,
    //   );

    //   if (totalTaskHours !== 8) {
    //     return res.status(400).json({
    //       error: false,
    //       message: "Please add task of 8 hour then check in.",
    //       data: {
    //         task_exists: taskExistsFlag,
    //         total_task_hours: totalTaskHours,
    //       },
    //     });
    //   }

    const checkLeaveSql = `SELECT id FROM attendance WHERE user_id = ? AND date = ? AND is_deleted = 0`;

    db.query(checkLeaveSql, [user_id, currentDate], (err, results) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const attendance = {
        user_id: user_id,
        date: this_data.date,
        checkin: this_data.checkin,
        latitude: this_data.latitude,
        longitude: this_data.longitude,
        in_reason: this_data.in_reason,
        updated_by: user_id,
        updated_at: getCurrentDateAndTime(),
      };

      if (results.length > 0) {
        const attendanceId = results[0].id;
        db.query(
          "UPDATE attendance SET ? WHERE id = ?",
          [attendance, attendanceId],
          (updateErr) => {
            if (updateErr) {
              return res.status(500).json({
                error: true,
                message: updateErr.sqlMessage,
                data: {},
              });
            }
            res.status(200).json({
              error: false,
              message: "Attendance updated successfully.",
              data: { id: attendanceId },
            });
          },
        );
      } else {
        attendance.created_by = user_id;
        attendance.created_at = getCurrentDateAndTime();
        attendance.is_deleted = 0;

        db.query(
          "INSERT INTO attendance SET ?",
          attendance,
          (insertErr, result) => {
            if (insertErr) {
              return res.status(500).json({
                error: true,
                message: insertErr.sqlMessage,
                data: {},
              });
            }
            res.status(201).json({
              error: false,
              message: "Check-in has been added successfully.",
              data: { id: result.insertId },
            });
          },
        );
      }
    });
    // });
  },
  updateAttendance: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const updated_data = req.body;
    const todayDate = req.body.date;

    const todayWeekday = new Date(todayDate).toLocaleDateString("en-US", {
      weekday: "long",
    });

    // How much buffer (in minutes) below the full shift length is still acceptable
    // e.g. an 8-hour shift only requires 7h20m (8h - 40min buffer) of logged task time
    const TASK_HOURS_BUFFER_MINUTES = 40;

    const formatHours = (decimalHours) => {
      const h = Math.floor(decimalHours);
      const m = Math.round((decimalHours - h) * 60);
      return `${h}h ${m}m`;
    };

    // Round decimal hours to the nearest minute (as an integer minute count).
    // Used instead of comparing raw floats, since summed/derived decimal hours
    // can differ by fractions of a minute even when they display identically
    // via formatHours() (e.g. 6.329999... vs 6.333333... both show "6h 20m").
    const toMinutes = (decimalHours) => Math.round(decimalHours * 60);

    // Step 1: Get attendance record
    db.query(
      "SELECT id, checkin FROM attendance WHERE user_id = ? AND date = ? AND is_deleted = 0",
      [user_id, todayDate],
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (result.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Attendance not found or already deleted.",
            data: {},
          });
        }

        const attendance_id = result[0].id;
        const checkInTime = result[0].checkin;
        const checkOutTime = updated_data.checkout;

        // Step 1.5: Validate today's operational meeting data before allowing checkout
        db.query(
          "SELECT clarity_1_key_highlight, clarity_1_key_action, clarity_2_key_highlight, clarity_2_key_action FROM op_meeting_detail WHERE user_id = ? AND date = ?",
          [user_id, todayDate],
          function (err, meetingResult) {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            const meetingRow = meetingResult[0];

            const isEmpty = (val) =>
              val === null || val === undefined || String(val).trim() === "";

            if (
              !meetingRow ||
              isEmpty(meetingRow.clarity_1_key_highlight) ||
              isEmpty(meetingRow.clarity_1_key_action) ||
              isEmpty(meetingRow.clarity_2_key_highlight) ||
              isEmpty(meetingRow.clarity_2_key_action)
            ) {
              return res.status(400).json({
                error: true,
                message: "Please fill today operational meeting data.",
                data: {},
              });
            }

            // Step 2: Get shift_id from users
            db.query(
              "SELECT shift_id FROM users WHERE id = ?",
              [user_id],
              function (err, userResult) {
                if (err) {
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                }

                if (userResult.length === 0) {
                  return res.status(404).json({
                    error: true,
                    message: "User not found.",
                    data: {},
                  });
                }

                const shiftId = userResult[0].shift_id;

                // Step 3: Get shift schedule
                db.query(
                  "SELECT week, from_time, to_time FROM user_time WHERE shift_id = ?",
                  [shiftId],
                  function (err, schedule) {
                    if (err) {
                      return res.status(500).json({
                        error: true,
                        message: err.sqlMessage,
                        data: {},
                      });
                    }

                    const todaySchedule = schedule.find(
                      (row) => row.week === todayWeekday,
                    );
                    if (!todaySchedule) {
                      return res.status(400).json({
                        error: true,
                        message: `No schedule found for ${todayWeekday}`,
                        data: {},
                      });
                    }

                    // Check if it's an off day (no from_time in schedule)
                    if (!todaySchedule.from_time) {
                      return res.status(400).json({
                        error: true,
                        message: `${todayWeekday} is an off day. No attendance expected.`,
                        data: {},
                      });
                    }

                    const scheduledIn = new Date(
                      `1970-01-01T${todaySchedule.from_time}`,
                    );
                    const scheduledOut = todaySchedule.to_time
                      ? new Date(`1970-01-01T${todaySchedule.to_time}`)
                      : null;

                    const shiftTotalMs = scheduledOut
                      ? scheduledOut - scheduledIn
                      : 0;
                    const shiftTotalHours = shiftTotalMs / (1000 * 60 * 60);

                    // Required task-logged hours = shift hours minus small buffer
                    const requiredTaskHours = Math.max(
                      0,
                      shiftTotalHours - TASK_HOURS_BUFFER_MINUTES / 60,
                    );

                    // Step 3.5: Validate today's total logged task hours before checkout
                    db.query(
                      "SELECT COALESCE(SUM(hours), 0) AS total_task_hours,COALESCE(SUM(minutes), 0) AS total_task_minutes FROM pms WHERE created_by = ? AND  DATE(created_at)=? AND is_deleted = 0",
                      [user_id, todayDate],
                      function (err, taskHoursResult) {
                        if (err) {
                          return res.status(500).json({
                            error: true,
                            message: err.sqlMessage,
                            data: {},
                          });
                        }

                        const sumHours = parseInt(
                          taskHoursResult[0]?.total_task_hours || 0,
                          10,
                        );
                        const sumMinutes = parseInt(
                          taskHoursResult[0]?.total_task_minutes || 0,
                          10,
                        );

                        const totalTaskMinutesRaw = sumHours * 60 + sumMinutes;
                        const totalTaskHours = totalTaskMinutesRaw / 60;

                        // Compare at minute-level resolution instead of raw floats,
                        // so values that display the same (e.g. "6h 20m") aren't
                        // treated as unequal due to sub-minute float drift.
                        if (
                          toMinutes(totalTaskHours) <
                          toMinutes(requiredTaskHours)
                        ) {
                          return res.status(400).json({
                            error: true,
                            message: `Please complete today's task of ${formatHours(
                              requiredTaskHours,
                            )} before checkout. Currently logged: ${formatHours(
                              totalTaskHours,
                            )}.`,
                            data: {
                              required_task_hours: requiredTaskHours,
                              logged_task_hours: totalTaskHours,
                            },
                          });
                        }

                        // Step 4: Determine attendance type based on shift hours
                        const actualIn = new Date(`1970-01-01T${checkInTime}`);
                        const actualOut = new Date(
                          `1970-01-01T${checkOutTime}`,
                        );

                        const totalTimeMs = actualOut - actualIn;
                        if (isNaN(totalTimeMs) || totalTimeMs < 0) {
                          return res.status(400).json({
                            error: true,
                            message: "Invalid check-in or check-out time.",
                            data: {},
                          });
                        }

                        const totalHours = totalTimeMs / (1000 * 60 * 60);

                        // Step 4.5: PMS logged hours can't meet/exceed actual attendance duration
                        // e.g. check-in 9:00, check-out 18:00 => totalHours = 9
                        // minus 40 min lunch => net available = 8h20m
                        // If PMS hours >= totalHours (raw in-to-out span), it's not physically
                        // possible, so block the checkout.
                        const netAvailableHours = Math.max(
                          0,
                          totalHours - TASK_HOURS_BUFFER_MINUTES / 60,
                        );

                        // Same minute-level comparison here, for consistency with the
                        // required-hours check above and with what formatHours() displays.
                        if (
                          toMinutes(totalTaskHours) >= toMinutes(totalHours)
                        ) {
                          return res.status(400).json({
                            error: true,
                            message: `Logged task hours (${formatHours(
                              totalTaskHours,
                            )}) cannot be equal to or greater than your actual check-in to check-out time (${formatHours(
                              totalHours,
                            )}). Net available time after 40 min lunch is ${formatHours(
                              netAvailableHours,
                            )}.`,
                            data: {
                              checkin: checkInTime,
                              checkout: checkOutTime,
                              total_attendance_hours: totalHours,
                              net_available_hours: netAvailableHours,
                              logged_task_hours: totalTaskHours,
                            },
                          });
                        }

                        const halfDayThreshold = shiftTotalHours / 2;
                        const minPresentMs = 1 * 60 * 1000; // 1 minute minimum

                        let attType;
                        if (totalTimeMs < minPresentMs) {
                          attType = 4; // Too short, not counted
                        } else if (totalHours >= shiftTotalHours) {
                          attType = 1; // Full day
                        } else if (totalHours >= halfDayThreshold) {
                          attType = 2; // Half day
                        } else {
                          attType = 4; // Short / absent
                        }

                        const updatedAttendance = {
                          date: todayDate,
                          checkout: checkOutTime,
                          total_hours: totalHours,
                          att_type: attType,
                          out_latitude: updated_data.latitude,
                          out_longitude: updated_data.longitude,
                          out_reason: updated_data.out_reason,
                          updated_by: user_id,
                          updated_at: getCurrentDateAndTime(),
                        };

                        // Step 5: Update attendance record
                        db.query(
                          "UPDATE attendance SET ? WHERE id = ? AND is_deleted = 0",
                          [updatedAttendance, attendance_id],
                          function (err, updateResult) {
                            if (err) {
                              return res.status(500).json({
                                error: true,
                                message: err.sqlMessage,
                                data: {},
                              });
                            }

                            if (updateResult.affectedRows === 0) {
                              return res.status(404).json({
                                error: true,
                                message:
                                  "Attendance not found or already deleted.",
                                data: {},
                              });
                            }

                            return res.status(200).json({
                              error: false,
                              message:
                                "Attendance has been updated successfully.",
                              data: {
                                id: attendance_id,
                                total_hours: totalHours,
                                att_type: attType,
                              },
                            });
                          },
                        ); // end UPDATE query
                      },
                    ); // end task hours query
                  },
                ); // end user_time query
              },
            ); // end users query
          },
        ); // end op_meeting_detail query
      },
    ); // end attendance query
  },

  // updateAttendance: function (req, res) {
  //   const user_id = req.user ? req.user.id : null;
  //   const updated_data = req.body;
  //   const todayDate = req.body.date;

  //   const todayWeekday = new Date(todayDate).toLocaleDateString("en-US", {
  //     weekday: "long",
  //   });

  //   // How much buffer (in minutes) below the full shift length is still acceptable
  //   // e.g. an 8-hour shift only requires 7h20m (8h - 40min buffer) of logged task time
  //   const TASK_HOURS_BUFFER_MINUTES = 40;

  //   const formatHours = (decimalHours) => {
  //     const h = Math.floor(decimalHours);
  //     const m = Math.round((decimalHours - h) * 60);
  //     return `${h}h ${m}m`;
  //   };

  //   // Step 1: Get attendance record
  //   db.query(
  //     "SELECT id, checkin FROM attendance WHERE user_id = ? AND date = ? AND is_deleted = 0",
  //     [user_id, todayDate],
  //     function (err, result) {
  //       if (err) {
  //         return res
  //           .status(500)
  //           .json({ error: true, message: err.sqlMessage, data: {} });
  //       }

  //       if (result.length === 0) {
  //         return res.status(404).json({
  //           error: true,
  //           message: "Attendance not found or already deleted.",
  //           data: {},
  //         });
  //       }

  //       const attendance_id = result[0].id;
  //       const checkInTime = result[0].checkin;
  //       const checkOutTime = updated_data.checkout;

  //       // Step 1.5: Validate today's operational meeting data before allowing checkout
  //       db.query(
  //         "SELECT clarity_1_key_highlight, clarity_1_key_action, clarity_2_key_highlight, clarity_2_key_action FROM op_meeting_detail WHERE user_id = ? AND date = ?",
  //         [user_id, todayDate],
  //         function (err, meetingResult) {
  //           if (err) {
  //             return res
  //               .status(500)
  //               .json({ error: true, message: err.sqlMessage, data: {} });
  //           }

  //           const meetingRow = meetingResult[0];

  //           const isEmpty = (val) =>
  //             val === null || val === undefined || String(val).trim() === "";

  //           if (
  //             !meetingRow ||
  //             isEmpty(meetingRow.clarity_1_key_highlight) ||
  //             isEmpty(meetingRow.clarity_1_key_action) ||
  //             isEmpty(meetingRow.clarity_2_key_highlight) ||
  //             isEmpty(meetingRow.clarity_2_key_action)
  //           ) {
  //             return res.status(400).json({
  //               error: true,
  //               message: "Please fill today operational meeting data.",
  //               data: {},
  //             });
  //           }

  //       // Step 2: Get shift_id from users
  //       db.query(
  //         "SELECT shift_id FROM users WHERE id = ?",
  //         [user_id],
  //         function (err, userResult) {
  //           if (err) {
  //             return res
  //               .status(500)
  //               .json({ error: true, message: err.sqlMessage, data: {} });
  //           }

  //           if (userResult.length === 0) {
  //             return res.status(404).json({
  //               error: true,
  //               message: "User not found.",
  //               data: {},
  //             });
  //           }

  //           const shiftId = userResult[0].shift_id;

  //           // Step 3: Get shift schedule
  //           db.query(
  //             "SELECT week, from_time, to_time FROM user_time WHERE shift_id = ?",
  //             [shiftId],
  //             function (err, schedule) {
  //               if (err) {
  //                 return res.status(500).json({
  //                   error: true,
  //                   message: err.sqlMessage,
  //                   data: {},
  //                 });
  //               }

  //               const todaySchedule = schedule.find(
  //                 (row) => row.week === todayWeekday,
  //               );
  //               if (!todaySchedule) {
  //                 return res.status(400).json({
  //                   error: true,
  //                   message: `No schedule found for ${todayWeekday}`,
  //                   data: {},
  //                 });
  //               }

  //               // Check if it's an off day (no from_time in schedule)
  //               if (!todaySchedule.from_time) {
  //                 return res.status(400).json({
  //                   error: true,
  //                   message: `${todayWeekday} is an off day. No attendance expected.`,
  //                   data: {},
  //                 });
  //               }

  //               const scheduledIn = new Date(
  //                 `1970-01-01T${todaySchedule.from_time}`,
  //               );
  //               const scheduledOut = todaySchedule.to_time
  //                 ? new Date(`1970-01-01T${todaySchedule.to_time}`)
  //                 : null;

  //               const shiftTotalMs = scheduledOut
  //                 ? scheduledOut - scheduledIn
  //                 : 0;
  //               const shiftTotalHours = shiftTotalMs / (1000 * 60 * 60);

  //               // Required task-logged hours = shift hours minus small buffer
  //               const requiredTaskHours = Math.max(
  //                 0,
  //                 shiftTotalHours - TASK_HOURS_BUFFER_MINUTES / 60,
  //               );

  //               // Step 3.5: Validate today's total logged task hours before checkout
  //               db.query(
  //                 "SELECT COALESCE(SUM(hours), 0) AS total_task_hours FROM pms WHERE created_by = ? AND  DATE(created_at)=? AND is_deleted = 0",
  //                 [user_id, todayDate],
  //                 function (err, taskHoursResult) {
  //                   if (err) {
  //                     return res.status(500).json({
  //                       error: true,
  //                       message: err.sqlMessage,
  //                       data: {},
  //                     });
  //                   }

  //                   const totalTaskHours = parseFloat(
  //                     taskHoursResult[0]?.total_task_hours || 0,
  //                   );

  //                   if (totalTaskHours < requiredTaskHours) {
  //                     return res.status(400).json({
  //                       error: true,
  //                       message: `Please complete today's task of ${formatHours(
  //                         requiredTaskHours,
  //                       )} before checkout. Currently logged: ${formatHours(
  //                         totalTaskHours,
  //                       )}.`,
  //                       data: {
  //                         required_task_hours: requiredTaskHours,
  //                         logged_task_hours: totalTaskHours,
  //                       },
  //                     });
  //                   }

  //                   // Step 4: Determine attendance type based on shift hours
  //                   const actualIn = new Date(`1970-01-01T${checkInTime}`);
  //                   const actualOut = new Date(`1970-01-01T${checkOutTime}`);

  //                   const totalTimeMs = actualOut - actualIn;
  //                   if (isNaN(totalTimeMs) || totalTimeMs < 0) {
  //                     return res.status(400).json({
  //                       error: true,
  //                       message: "Invalid check-in or check-out time.",
  //                       data: {},
  //                     });
  //                   }

  //                   const totalHours = totalTimeMs / (1000 * 60 * 60);

  //                     // Step 4.5: PMS logged hours can't meet/exceed actual attendance duration
  //                   // e.g. check-in 9:00, check-out 18:00 => totalHours = 9
  //                   // minus 40 min lunch => net available = 8h20m
  //                   // If PMS hours >= totalHours (raw in-to-out span), it's not physically
  //                   // possible, so block the checkout.
  //                   const netAvailableHours = Math.max(
  //                     0,
  //                     totalHours - TASK_HOURS_BUFFER_MINUTES / 60,
  //                   );

  //                   if (totalTaskHours >= totalHours) {
  //                     return res.status(400).json({
  //                       error: true,
  //                       message: `Logged task hours (${formatHours(
  //                         totalTaskHours,
  //                       )}) cannot be equal to or greater than your actual check-in to check-out time (${formatHours(
  //                         totalHours,
  //                       )}). Net available time after 40 min lunch is ${formatHours(
  //                         netAvailableHours,
  //                       )}.`,
  //                       data: {
  //                         checkin: checkInTime,
  //                         checkout: checkOutTime,
  //                         total_attendance_hours: totalHours,
  //                         net_available_hours: netAvailableHours,
  //                         logged_task_hours: totalTaskHours,
  //                       },
  //                     });
  //                   }

  //                   const halfDayThreshold = shiftTotalHours / 2;
  //                   const minPresentMs = 1 * 60 * 1000; // 1 minute minimum

  //                   let attType;
  //                   if (totalTimeMs < minPresentMs) {
  //                     attType = 4; // Too short, not counted
  //                   } else if (totalHours >= shiftTotalHours) {
  //                     attType = 1; // Full day
  //                   } else if (totalHours >= halfDayThreshold) {
  //                     attType = 2; // Half day
  //                   } else {
  //                     attType = 4; // Short / absent
  //                   }

  //                   const updatedAttendance = {
  //                     date: todayDate,
  //                     checkout: checkOutTime,
  //                     total_hours: totalHours,
  //                     att_type: attType,
  //                     out_latitude: updated_data.latitude,
  //                     out_longitude: updated_data.longitude,
  //                     out_reason: updated_data.out_reason,
  //                     updated_by: user_id,
  //                     updated_at: getCurrentDateAndTime(),
  //                   };

  //                   // Step 5: Update attendance record
  //                   db.query(
  //                     "UPDATE attendance SET ? WHERE id = ? AND is_deleted = 0",
  //                     [updatedAttendance, attendance_id],
  //                     function (err, updateResult) {
  //                       if (err) {
  //                         return res.status(500).json({
  //                           error: true,
  //                           message: err.sqlMessage,
  //                           data: {},
  //                         });
  //                       }

  //                       if (updateResult.affectedRows === 0) {
  //                         return res.status(404).json({
  //                           error: true,
  //                           message: "Attendance not found or already deleted.",
  //                           data: {},
  //                         });
  //                       }

  //                       return res.status(200).json({
  //                         error: false,
  //                         message: "Attendance has been updated successfully.",
  //                         data: {
  //                           id: attendance_id,
  //                           total_hours: totalHours,
  //                           att_type: attType,
  //                         },
  //                       });
  //                     },
  //                   ); // end UPDATE query
  //                 },
  //               ); // end task hours query
  //             },
  //           ); // end user_time query
  //         },
  //       ); // end users query
  //       },
  //       ); // end op_meeting_detail query
  //     },
  //   ); // end attendance query
  // },

  updateBreak: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const updated_data = req.body;

    const todayDate = new Date().toISOString().split("T")[0];

    db.query(
      "SELECT id,breakin, breakout FROM attendance  WHERE user_id = ? AND date = ? AND is_deleted = 0",
      [user_id, todayDate],
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (result.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Attendance not found or already deleted.",
            data: {},
          });
        }
        const attendance_id = result[0].id;
        const currentBreakData = result[0];
        const updateBreakData = {};

        if (!currentBreakData.breakin) {
          updateBreakData.breakin = updated_data.breakin;
        }

        if (!currentBreakData.breakout) {
          updateBreakData.breakout = updated_data.breakout;
        }

        if (!Object.keys(updateBreakData).length) {
          return res.status(400).json({
            error: true,
            message: "Both breakin and breakout are already set.",
            data: {},
          });
        }

        updateBreakData.updated_by = user_id;
        updateBreakData.updated_at = getCurrentDateAndTime();
        db.query(
          "UPDATE attendance SET ? WHERE id = ? AND is_deleted = 0",
          [updateBreakData, attendance_id],
          function (err, updateResult) {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            }

            if (updateResult.affectedRows === 0) {
              return res.status(404).json({
                error: true,
                message: "Attendance not found or already deleted.",
                data: {},
              });
            }

            const data = {
              error: false,
              message: "Break has been updated successfully.",
              data: {
                id: attendance_id,
                breakin: updateBreakData.breakin || currentBreakData.breakin,
                breakout: updateBreakData.breakout || currentBreakData.breakout,
              },
            };
            res.status(200).json(data);
          },
        );
      },
    );
  },

  addleavemobile: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    const currentDate = this_data.date;

    if (!user_id) {
      return res
        .status(400)
        .json({ error: true, message: "User ID is required.", data: {} });
    }

    const checkLeaveSql = `SELECT id FROM attendance WHERE user_id = ? AND date = ? AND is_deleted = 0`;

    db.query(checkLeaveSql, [user_id, currentDate], function (err, results) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (results.length > 0) {
        return res.status(400).json({
          error: true,
          message: "Leave for today has already been added.",
          data: {},
        });
      }
      const attendance = {
        user_id: user_id,
        date: currentDate,
        reason: this_data.reason,
        att_type: this_data.type,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query(
        "INSERT INTO attendance SET ?",
        attendance,
        function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          res.status(201).json({
            error: false,
            message: "Leave has been added successfully.",
          });
        },
      );
    });
  },

  getLeaveListbyid: (req, res) => {
    const user_id = req.user ? req.user.id : null;

    var sql = `
        SELECT 
            CAST(id AS CHAR) AS id, 
            CAST(att_type AS CHAR) AS att_type, 
            IFNULL(reason, '') AS reason, 
            IFNULL(CAST(status AS CHAR), '') AS status, 
            DATE_FORMAT(date, '%e %M %Y') AS date 
        FROM attendance 
        WHERE is_deleted = 0 
          AND att_type IN (2, 3) 
          AND user_id = ?;
    `;

    db.query(sql, [user_id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        const formattedResult = result.map((row) => ({
          id: row.id.toString(),
          att_type: row.att_type.toString(),
          reason: row.reason,
          status: row.status || "",
          date: row.date,
        }));

        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: formattedResult,
        });
      }
    });
  },

  AddTask: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const assignTo =
      this_data.assign_task === "myself"
        ? user_id
        : this_data.assign_task === "assignto"
          ? this_data.employee
          : null;

    const contribution =
      this_data.assign_task === "collabration" ? this_data.employee : null;

    // Assign default or empty values for optional fields
    const task = {
      date: this_data.date,
      userid: user_id,
      priority: this_data.priority,
      task: this_data.work,
      due_date: this_data.date,
      location: this_data.location,
      hours: this_data.hours,
      project_id: this_data.project_id ?? "",
      assign_to: assignTo,
      contributon: contribution,
      status: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    if (this_data.taskId) {
      // Update query
      const updateQuery = `
          UPDATE todos
          SET
            date = ?,  userid = ?, priority = ?, task = ?, project_id = ?, location = ?,
            assign_to = ?, contributon = ?, status = ?, updated_by = ?, updated_at = ?, is_deleted = ?
          WHERE id = ?`;

      const updateValues = [
        task.date,
        task.userid,
        task.priority,
        task.task,
        task.project_id,
        task.location,
        task.assign_to,
        task.contributon,
        task.status,
        user_id,
        getCurrentDateAndTime(),
        task.is_deleted,
        this_data.taskId,
      ];

      db.query(updateQuery, updateValues, function (err) {
        if (err) {
          console.error("Database error:", err.sqlMessage);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        res.status(200).json({
          error: false,
          message: "Task has been updated successfully.",
        });
      });
    } else {
      // Insert query
      db.query("INSERT INTO todos SET ?", task, function (err, result) {
        if (err) {
          console.error("Database error:", err.sqlMessage);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Task has been added successfully.",
        };

        res.status(201).json(data);
      });
    }
  },

  fetchAllTaskbyTeamId: (req, res) => {
    const user_id = req?.user?.id;

    // Using a parameterized query to prevent SQL injection
    const taskSql = `
     SELECT 
        t.id,
        t.hours,
     COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN t.status != 1 THEN 1 END) AS uncompleted_tasks,
        t.userid,
        t.due_date,
        t.priority,
        t.assign_to,
        t.contributon,
        t.task,
        t.location,
            t.verified_by,
            t.verified,
        t.project_id,
        t.status,
        nmf.case_id AS project,
         GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
             GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
    FROM 
        todos AS t
    LEFT JOIN 
        new_mst_file AS nmf 
    ON 
        nmf.id = t.project_id
        LEFT JOIN users AS at
    ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
    LEFT JOIN users AS cu
    ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
    WHERE 
        t.is_deleted = 0 
        and t.assign_to = ?
    GROUP BY 
        t.due_date, 
        t.id, 
        t.userid, 
        t.priority, 
        t.assign_to,
        t.contributon, 
        t.task,
        t.verified_by, 
        t.verified,
        t.project_id, 
        t.status, 
         t.location,
        nmf.case_id
        ORDER BY 
        t.due_date DESC;
      `;

    db.query(taskSql, [user_id], (taskErr, taskResults) => {
      if (taskErr) {
        return res
          .status(500)
          .json({ message: taskErr.sqlMessage, error: true, data: {} });
      }

      const groupedData = taskResults.reduce((acc, curr) => {
        // Format the date using moment.js
        const formattedDate = moment(curr.due_date).format("D MMM YYYY");
        const completedtasks = String(curr.completed_tasks || "");
        const uncompletedtasks = String(curr.uncompleted_tasks || "");
        const verified = String(curr.verified || "");
        const verified_by = String(curr.verified_by || "");

        // Determine priority color
        let priorityColor;
        if (curr.priority === "1") {
          priorityColor = "red";
        } else if (curr.priority === "2") {
          priorityColor = "yellow";
        } else if (curr.priority === "3") {
          priorityColor = "green";
        }

        // Group tasks by formatted date
        if (!acc[formattedDate]) {
          acc[formattedDate] = {
            date: formattedDate,
            completedtasks: completedtasks,
            uncompletedtasks: uncompletedtasks,
            verified: verified,
            verified_by: verified_by,
            tasksDetail: [],
          };
        }
        acc[formattedDate].tasksDetail.push({
          date: formattedDate,
          id: String(curr.id || ""), // Convert to string
          userid: String(curr.userid || ""), // Convert to string
          hours: String(curr.hours || ""),
          priority: curr.priority || "", // Already string
          contributon: curr.contributon || "", // Already string
          projectId: String(curr.project_id || ""), // Convert to string
          task: curr.task || "",
          status: String(curr.status || ""),
          location: String(curr.location || ""),
          assign_to: curr.assign_to || "",
          project: curr.project || "",
          assign_to_profile: curr.assign_to_profiles
            ? curr.assign_to_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
          contribution_profile: curr.contribution_profiles
            ? curr.contribution_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
        });
        return acc;
      }, {});

      const responseData = {
        tasks: Object.values(groupedData),
      };

      res.status(200).json({
        message: "Record Fetched",
        error: false,
        data: responseData,
      });
    });
  },
  fetchAlltaskforAdmin: (req, res) => {
    // Using a parameterized query to prevent SQL injection
    const taskSql = `
     SELECT 
        t.id,
     COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN t.status != 1 THEN 1 END) AS uncompleted_tasks,
        t.userid,
        t.due_date,
        t.priority,
        t.assign_to,
        t.contributon,
        t.task,
        t.mst_department_id,
            t.verified_by,
            t.verified,
        t.project_id,
        t.status,
        nmf.case_id AS project,
         GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
             GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
    FROM 
        todos AS t
    LEFT JOIN 
        new_mst_file AS nmf 
    ON 
        nmf.id = t.project_id
        LEFT JOIN users AS at
    ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
    LEFT JOIN users AS cu
    ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
    WHERE 
        t.is_deleted = 0
    GROUP BY 
        t.due_date, 
        t.id, 
        t.userid, 
        t.priority, 
        t.mst_department_id,
        t.assign_to,
        t.contributon, 
        t.task,
        t.verified_by, 
        t.verified,
        t.project_id, 
        t.status, 
        nmf.case_id
        ORDER BY 
        t.due_date DESC;
      `;

    db.query(taskSql, (taskErr, taskResults) => {
      if (taskErr) {
        return res
          .status(500)
          .json({ message: taskErr.sqlMessage, error: true, data: {} });
      }

      const groupedData = taskResults.reduce((acc, curr) => {
        // Format the date using moment.js
        const formattedDate = moment(curr.due_date).format("D MMM YYYY");
        const completedtasks = String(curr.completed_tasks || "");
        const uncompletedtasks = String(curr.uncompleted_tasks || "");
        const verified = String(curr.verified || "");
        const verified_by = String(curr.verified_by || "");

        // Determine priority color
        let priorityColor;
        if (curr.priority === "1") {
          priorityColor = "red";
        } else if (curr.priority === "2") {
          priorityColor = "yellow";
        } else if (curr.priority === "3") {
          priorityColor = "green";
        }
        const key = `${formattedDate}-${curr.assign_to || "unassigned"}-${
          curr.contributon || "no_contributor"
        }`;

        // Group tasks by formatted date
        if (!acc[key]) {
          acc[key] = {
            date: formattedDate,
            assign_to: curr.assign_to || "",
            contributon: curr.contributon || "",
            completedtasks: completedtasks,
            uncompletedtasks: uncompletedtasks,
            verified: verified,
            verified_by: verified_by,
            assign_to_profile: new Set(), // Store as Set to ensure unique values
            contribution_profile: new Set(),
            tasksDetail: [],
          };
        }
        // Convert profile pictures to full URLs and add to Set
        if (curr.assign_to_profiles) {
          curr.assign_to_profiles.split(",").forEach((profile) => {
            acc[key].assign_to_profile.add(
              `http://62.72.30.155:7600/${profile}`,
            );
          });
        }

        if (curr.contribution_profiles) {
          curr.contribution_profiles.split(",").forEach((profile) => {
            acc[key].contribution_profile.add(
              `http://62.72.30.155:7600/${profile}`,
            );
          });
        }
        acc[key].tasksDetail.push({
          date: formattedDate,
          id: String(curr.id || ""), // Convert to string
          userid: String(curr.userid || ""), // Convert to string
          priority: curr.priority || "", // Already string
          contributon: curr.contributon || "", // Already string
          projectId: String(curr.project_id || ""), // Convert to string
          task: curr.task || "",
          departmentId: String(curr.mst_department_id || ""),
          status: String(curr.status || ""),
          assign_to: curr.assign_to || "",
          project: curr.project || "",
          assign_to_profile: curr.assign_to_profiles
            ? curr.assign_to_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
          contribution_profile: curr.contribution_profiles
            ? curr.contribution_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
        });
        return acc;
      }, {});

      Object.keys(groupedData).forEach((key) => {
        // Convert Set to Array, then join into a string or return empty string
        groupedData[key].assign_to_profile =
          groupedData[key].assign_to_profile.size > 0
            ? Array.from(groupedData[key].assign_to_profile).join(", ")
            : "";

        groupedData[key].contribution_profile =
          groupedData[key].contribution_profile.size > 0
            ? Array.from(groupedData[key].contribution_profile).join(", ")
            : "";
      });

      res.status(200).json({
        message: "Record Fetched",
        error: false,
        data: Object.values(groupedData),
      });
    });
  },

  getmstdepartment: (req, res) => {
    // Using a parameterized query to prevent SQL injection
    var sql = "SELECT id,name FROM mst_department";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  getMeetingbyTeamId: (req, res) => {
    const id = req.body.id;
    console.log("id==>", req.body);

    // Using a parameterized query to prevent SQL injection
    var sql = "SELECT * FROM participants WHERE participant = ?";

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  UpdateLocation: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const updated_data = req.body;
    const TaskId = req.body.id;

    // Convert total time to HH:mm:ss format

    const updatedTask = {
      location: updated_data.location,
      updated_by: user_id,
      updated_at: getCurrentDateAndTime(),
    };

    // Update the attendance record
    db.query(
      "UPDATE todos SET ? WHERE id = ? AND is_deleted = 0",
      [updatedTask, TaskId],
      function (err, updateResult) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Location not found or already deleted.",
            data: {},
          });
        }

        const data = {
          error: false,
          message: "Meeting Details has been updated successfully.",
          data: {
            id: TaskId,
          },
        };
        res.status(200).json(data);
      },
    );
  },

  updateOperationMeetingtask: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const updated_data = req.body;
    const TaskId = req.body.id;

    // Convert total time to HH:mm:ss format

    const updatedTask = {
      key_highlights: updated_data.key_highlights,
      key_action: updated_data.key_action,
      updated_by: user_id,
      updated_at: getCurrentDateAndTime(),
    };

    // Update the attendance record
    db.query(
      "UPDATE participants SET ? WHERE id = ? AND is_deleted = 0",
      [updatedTask, TaskId],
      function (err, updateResult) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (updateResult.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Meeting Details not found or already deleted.",
            data: {},
          });
        }

        const data = {
          error: false,
          message: "Meeting Details has been updated successfully.",
          data: {
            id: TaskId,
          },
        };
        res.status(200).json(data);
      },
    );
  },

  updateTacticalPerformance: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    const user_id = req?.user?.id;

    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id FROM `tc_meeting_detail` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;

      const Performance = {
        key_highlight: this_data.key_highlight,
        key_action: this_data.key_action,
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
          Performance.key_highlight,
          Performance.key_action,
          Performance.what_missing,
          Performance.what_learn,
          Performance.what_different,
          Performance.what_done_when,
          Performance.updated_at,
          parseInt(Performance.updated_by),
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

  getPerformancebyid: (req, res) => {
    const id = req.body.id;

    // Using a parameterized query to prevent SQL injection
    var sql = "SELECT * FROM participants WHERE id = ?";

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },
  getTacticalmeeting: (req, res) => {
    const id = req.body.id;

    // Using a parameterized query to prevent SQL injection
    var sql =
      "SELECT * FROM participants WHERE typeofmeeting= 2 and participant = ?";

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  getStrategicmeeting: (req, res) => {
    const id = req.body.id;

    // Using a parameterized query to prevent SQL injection
    var sql =
      "SELECT * FROM participants WHERE typeofmeeting= 3 and participant = ?";

    db.query(sql, [id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  getTaskByTeamId: (req, res) => {
    const user_id = req?.user?.id;
    const todayDate = moment().format("YYYY-MM-DD");

    // SQL query to fetch tasks
    const taskSql = `
    SELECT
        t.due_date,
        COUNT(t.id) AS total_tasks,
        COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN t.status != 1 THEN 1 END) AS uncompleted_tasks,
        t.id,
        t.userid,
        t.priority,
        t.assign_to,
        t.contributon,
        t.verified_by,
        t.verified,
        t.task,
        t.project_id,
        t.status,
        nmf.case_id AS project,
        GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
        GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
    FROM todos AS t
    LEFT JOIN new_mst_file AS nmf ON nmf.id = t.project_id
    LEFT JOIN users AS at ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
    LEFT JOIN users AS cu ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
    WHERE t.is_deleted = 0
      AND FIND_IN_SET(?, t.assign_to) > 0
      AND t.due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      AND t.due_date <= CURDATE()
    GROUP BY t.due_date, t.id, t.userid, t.priority, t.assign_to, t.contributon, t.task,
        t.verified, t.verified_by, t.project_id, t.status, nmf.case_id
    ORDER BY t.due_date DESC`;

    // SQL query to fetch attendance
    const attendanceSql = `
        SELECT checkin, checkout, breakin, breakout
        FROM attendance
        WHERE date = ? AND user_id = ?`;

    db.query(
      attendanceSql,
      [todayDate, user_id],
      (attendanceErr, attendanceResults) => {
        if (attendanceErr) {
          return res
            .status(500)
            .json({ message: attendanceErr.sqlMessage, error: true, data: {} });
        }

        const attendance = attendanceResults[0] || {
          checkin: "",
          checkout: "",
          breakin: "",
          breakout: "",
        };

        let checktype = "1"; // Default checktype
        if (attendance.checkin) checktype = "2";
        if (attendance.breakin) checktype = "3";
        if (attendance.breakout) checktype = "4";
        if (attendance.checkout) checktype = "5";

        db.query(taskSql, [user_id], (taskErr, taskResults) => {
          if (taskErr) {
            return res
              .status(500)
              .json({ message: taskErr.sqlMessage, error: true, data: {} });
          }

          let totalCompletedTasks = 0;
          let totalUncompletedTasks = 0;

          const groupedData = taskResults.reduce((acc, curr) => {
            const formattedDate = moment(curr.due_date).format("D MMM YYYY");

            if (!acc[formattedDate]) {
              acc[formattedDate] = {
                date: formattedDate,
                total_tasks: curr.total_tasks || 0,
                completed_tasks: curr.completed_tasks || 0,
                uncompleted_tasks: curr.uncompleted_tasks || 0,
                verified: String(curr.verified || ""),
                verified_by: String(curr.verified_by || ""),
                tasksDetail: [],
              };

              // Update total counts
              totalCompletedTasks += curr.completed_tasks || 0;
              totalUncompletedTasks += curr.uncompleted_tasks || 0;
            }

            acc[formattedDate].tasksDetail.push({
              id: String(curr.id || ""),
              userid: String(curr.userid || ""),
              priority: curr.priority || "",
              contributon: curr.contributon || "",
              projectId: String(curr.project_id || ""),
              task: curr.task || "",
              status: String(curr.status || ""),
              assign_to: curr.assign_to || "",
              project: curr.project || "",
              assign_to_profile: curr.assign_to_profiles
                ? curr.assign_to_profiles
                    .split(",")
                    .map((profile) => `http://62.72.30.155:7600/${profile}`)
                : [],
              contribution_profile: curr.contribution_profiles
                ? curr.contribution_profiles
                    .split(",")
                    .map((profile) => `http://62.72.30.155:7600/${profile}`)
                : [],
            });

            return acc;
          }, {});

          const responseData = {
            tasks: Object.values(groupedData),
            total_completed_tasks: totalCompletedTasks,
            total_uncompleted_tasks: totalUncompletedTasks,
            attendance: {
              checkin: attendance.checkin || "",
              checkout: attendance.checkout || "",
              breakin: attendance.breakin || "",
              breakout: attendance.breakout || "",
            },
            checktype,
          };

          res.status(200).json({
            message: "Record Fetched",
            error: false,
            data: responseData,
          });
        });
      },
    );
  },

  checktaskCheckbox: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    console.log(this_data);

    const user_id = req?.user?.id;
    const Performance = {
      status: this_data.status,
      status_at: getCurrentDateAndTime(),
      status_by: user_id,
    };

    console.log("PerformancePerformance-->", Performance);

    const updateSql =
      "UPDATE `todos` SET " +
      "`status` = ?, " +
      "`status_at` = ?, " +
      "`status_by` = ? " +
      "WHERE `id` = ?";

    // console.log("updateSql", updateSql);

    db.query(
      updateSql,
      [
        Performance.status,
        Performance.status_at,
        parseInt(Performance.status_by),
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
            message: "Data not found",
            data: {},
          });
        }

        const response = {
          error: false,
          message: "Task has been updated successfully.",
          data: { id },
        };
        res.status(200).json(response);
      },
    );
  },

  getStage: async function (req, res) {
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

  getProject: async function (req, res) {
    var sql = "select id,case_id from new_mst_file where is_deleted = 0";

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

  Mobilelogin: async (req, res) => {
    try {
      const { email, password, device_token } = req.body;

      // Validate input
      req.assert("email", "Email or username required.").notEmpty();
      req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();

      const errors = req.validationErrors();
      if (errors) {
        return res
          .status(400)
          .json({ message: errors[0].msg, error: true, data: {} });
      }

      const sql = `
        SELECT users.id, users.password, users.active, users.comp_id, users.first_name, users.last_name,
               CONCAT(users.first_name, ' ', users.last_name) AS fullname, users.email, users.username, users.phone,
               users.profile_picture, users.device_token, users.isdeleted,
               users_groups.mst_group_id AS role_id, mst_groups.name AS role
        FROM users
        LEFT JOIN users_groups ON users_groups.mst_user_id = users.id
        LEFT JOIN mst_groups ON mst_groups.id = users_groups.mst_group_id
        WHERE users.email = ? AND users.isdeleted = 0
          AND mst_groups.name IN ( 'Employees', 'Client', 'cordinator', 'Hod')
      `;

      db.query(sql, [email], async (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        }

        if (result.length === 0) {
          return res
            .status(401)
            .json({ message: "Username doesn't exist", error: true, data: {} });
        }

        const user = result[0];

        // Role Mapping
        const roleMapping = {
          admin: 1,
          Employees: 2,
          Client: 4,
          Cordinator: 6,
          Hod: 7,
        };

        // Replace role names with their corresponding IDs
        let user_roles = result
          .map((r) => roleMapping[r.role] || null)
          .filter(Boolean);

        // If HOD is present, remove Employees (2)
        if (user_roles.includes(7)) {
          user_roles = user_roles.filter((role) => role !== 2);
        }
        const user_roles_string = user_roles.join(",");

        // Verify password
        if (!bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({
            message: "Invalid Username/Password",
            error: true,
            data: {},
          });
        }

        // Check if user is active
        if (parseInt(user.active) !== 1) {
          return res
            .status(403)
            .json({ message: "Account is Inactive", error: true, data: {} });
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id,
            user_roles: user_roles,
            role: roleMapping[user.role] || null,
            comp_id: user.comp_id,
          },
          meta.thekey,
          { expiresIn: "365d" },
        );

        // Update device_token securely
        const updateTokenSql = "UPDATE users SET device_token = ? WHERE id = ?";
        db.query(updateTokenSql, [device_token, user.id], (updateErr) => {
          if (updateErr) {
            console.error("Device Token Update Error:", updateErr);
          }
        });

        // Response data
        const data = {
          id: user.id || "",
          image_path: "https://webapp.zaidexceldesign.com/",
          role_id: user.role_id || "",
          role: user_roles[0] || "",
          user_roles: user_roles_string,
          phone: user.phone || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          fullname: user.fullname || "",
          email: user.email || "",
          username: user.username || "",
          profile_picture: user.profile_picture || "",
          token: token,
          device_token: device_token || "",
        };

        return res.status(200).json({
          message: messageClass.RESPONSE.LOGIN_SUCCESS,
          error: false,
          data: data,
        });
      });
    } catch (err) {
      console.error("Login Server Error:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: true, data: {} });
    }
  },
  MobileloginAdmin: async (req, res) => {
    try {
      const { email, password, device_token } = req.body;

      // Validate input
      req.assert("email", "Email or username required.").notEmpty();
      req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();

      const errors = req.validationErrors();
      if (errors) {
        return res
          .status(400)
          .json({ message: errors[0].msg, error: true, data: {} });
      }

      const sql = `
        SELECT users.id, users.password, users.active, users.comp_id, users.first_name, users.last_name,
               CONCAT(users.first_name, ' ', users.last_name) AS fullname, users.email, users.username, users.phone,
               users.profile_picture, users.device_token, users.isdeleted,
               users_groups.mst_group_id AS role_id, mst_groups.name AS role
        FROM users
        LEFT JOIN users_groups ON users_groups.mst_user_id = users.id
        LEFT JOIN mst_groups ON mst_groups.id = users_groups.mst_group_id
        WHERE users.email = ? AND users.isdeleted = 0
          AND mst_groups.name IN ( "admin")
      `;

      db.query(sql, [email], async (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        }

        if (result.length === 0) {
          return res
            .status(401)
            .json({ message: "Username doesn't exist", error: true, data: {} });
        }

        const user = result[0];

        // Role Mapping
        const roleMapping = {
          admin: 1,
          Employees: 2,
          Client: 4,
          Cordinator: 6,
          Hod: 7,
        };

        // Replace role names with their corresponding IDs
        let user_roles = result
          .map((r) => roleMapping[r.role] || null)
          .filter(Boolean);

        // If HOD is present, remove Employees (2)
        if (user_roles.includes(7)) {
          user_roles = user_roles.filter((role) => role !== 2);
        }
        const user_roles_string =
          user_roles.length > 0 ? user_roles[0].toString() : "";
        // Verify password
        if (!bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({
            message: "Invalid Username/Password",
            error: true,
            data: {},
          });
        }

        // Check if user is active
        if (parseInt(user.active) !== 1) {
          return res
            .status(403)
            .json({ message: "Account is Inactive", error: true, data: {} });
        }

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user.id,
            user_roles: user_roles,
            role: roleMapping[user.role] || null,
            comp_id: user.comp_id,
          },
          meta.thekey,
          { expiresIn: "365d" },
        );

        // Update device_token securely
        const updateTokenSql = "UPDATE users SET device_token = ? WHERE id = ?";
        db.query(updateTokenSql, [device_token, user.id], (updateErr) => {
          if (updateErr) {
            console.error("Device Token Update Error:", updateErr);
          }
        });

        // Response data
        const data = {
          id: user.id || "",
          image_path: "https://webapp.zaidexceldesign.com/",
          role_id: user.role_id || "",
          role: roleMapping[user.role] || "",
          user_roles: user_roles_string,
          phone: user.phone || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          fullname: user.fullname || "",
          email: user.email || "",
          username: user.username || "",
          profile_picture: user.profile_picture || "",
          token: token,
          device_token: device_token || "",
        };

        return res.status(200).json({
          message: messageClass.RESPONSE.LOGIN_SUCCESS,
          error: false,
          data: data,
        });
      });
    } catch (err) {
      console.error("Login Server Error:", err);
      return res
        .status(500)
        .json({ message: "Server error", error: true, data: {} });
    }
  },

  fetchmeetingConfig: async function (req, res) {
    const sql1 = "SELECT id, case_id FROM new_mst_file WHERE is_deleted = 0";
    const sql2 = "SELECT * FROM mst_project_details WHERE is_deleted = 0";

    const sql3 = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.username,
        u.phone,
        u.profile_picture,
        u.created_at,
        u.active
      FROM users AS u
      LEFT JOIN users_groups AS mu ON mu.mst_user_id = u.id
      LEFT JOIN mst_groups AS mg ON mg.id = mu.mst_group_id
      WHERE u.isdeleted = 0 AND mg.name = 'Employees' AND u.active = 1
    `;

    try {
      // Execute all queries concurrently
      const [projects, stages, employees] = await Promise.all([
        new Promise((resolve, reject) => {
          db.query(sql1, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(sql2, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        }),
        new Promise((resolve, reject) => {
          db.query(sql3, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        }),
      ]);

      // Combine results
      const data = {
        projects,
        stages,
        employees,
      };

      res.status(200).json({
        error: false,
        message: "Records fetched successfully",
        data,
      });
    } catch (err) {
      res.status(500).json({
        error: true,
        message: err.sqlMessage || "Internal server error",
        data: {},
      });
    }
  },

  deleteTaskForApp: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `todos` SET ? WHERE `id`=" + id + "";

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

  getMobileTacticalDates: (req, res) => {
    try {
      var sql = `
SELECT DISTINCT date, DATE_FORMAT(date, '%e %M %Y') AS formatted_date
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

  getOperationalmeetingByEmployee: (req, res) => {
    const user_id = req?.body?.user_id;
    const { date } = req.body;

    const selectedDate = date || new Date().toISOString().split("T")[0];

    let sql = `SELECT 
    om.id, 
    DATE_FORMAT(om.date, '%e %M %Y') AS date,
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

    db.query(sql, [selectedDate, selectedDate, user_id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      }

      const processedResult = result.map((row) => ({
        ...row,
        participants_pictures: row.participants_pictures
          ? row.participants_pictures.split(",").map((pic) => pic.trim())
          : [],
        performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
      }));

      res.status(200).json({
        message: "Record Fetched",
        error: false,
        data: processedResult,
      });
    });
  },

  getOperationalmeetingforAdmin: (req, res) => {
    const date = req.body.date;

    const selectedDate = date || new Date().toISOString().split("T")[0];

    var sql = `
 SELECT om.id, 
  DATE_FORMAT(om.date, '%e %M %Y') AS date, om.mst_department_id, 
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
        ORDER BY om.id DESC
    `;

    db.query(sql, [selectedDate, selectedDate, selectedDate], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      }

      const processedResult = result.map((row) => ({
        ...row,
        participants_pictures: row.participants_pictures
          ? row.participants_pictures.split(",").map((pic) => pic.trim())
          : [],
        performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
      }));

      res.status(200).json({
        message: "Record Fetched",
        error: false,
        data: processedResult,
      });
    });
  },

  getOperationalmeetingforFaciltor: (req, res) => {
    const user_id = req?.user?.id;

    const { date } = req.body;

    const selectedDate = date || new Date().toISOString().split("T")[0];
    let sql = `SELECT 
    om.id, 
   DATE_FORMAT(om.date, '%e %M %Y') AS date,
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

    db.query(
      sql,
      [selectedDate, selectedDate, user_id, user_id],
      (err, result) => {
        if (err) {
          return res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        }

        const processedResult = result.map((row) => ({
          ...row,
          participants_pictures: row.participants_pictures
            ? row.participants_pictures.split(",").map((pic) => pic.trim())
            : [],
          performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
        }));

        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: processedResult,
        });
      },
    );
  },

  getTactticalMeetingforHOD: async function (req, res) {
    const user_id = req?.body?.user_id;
    const { date } = req.body;

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
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    //get current user
    var sql2 = `SELECT  
    tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,
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

  getTactticalMeetingforemp: async function (req, res) {
    const user_id = req?.body?.user_id;
    const { date } = req.body;

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
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    //get current user
    var sql2 = `SELECT  
    tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,
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

  gettacticalmeetingbyid: (req, res) => {
    const id = req?.body.id;
    const user_id = req.body.user_id;

    var sql = `SELECT 
    CAST(tmd.id AS CHAR) AS id,
    DATE_FORMAT(tmd.date, '%e %M %Y') AS formatted_date,
    IFNULL(md.name, '') AS Departmentname,
    IFNULL(u.first_name, '') AS first_name,
    IFNULL(u.last_name, '') AS last_name,
      IFNULL(tmd.key_highlight, '') AS key_highlight,
        IFNULL(tmd.key_action, '') AS key_action,
       IFNULL(tmd.what_missing, '') AS what_missing,
          IFNULL(tmd.what_learn, '') AS what_learn,
          IFNULL(tmd.what_different, '') AS what_different,
          IFNULL(tmd.what_done_when, '') AS what_done_when,
          IFNULL(tmd.total_task, '') AS what_goal,
          IFNULL(tmd.total_completed_tasks, '') AS what_done,
          IFNULL(tmd.total_uncompleted_tasks, '') AS what_not_done,
    -- Check if all key fields are empty
    CAST(
        IF(
            (ANY_VALUE(tmd.key_highlight) IS NULL OR ANY_VALUE(tmd.key_highlight) = '') AND
            (ANY_VALUE(tmd.key_action) IS NULL OR ANY_VALUE(tmd.key_action) = '') AND
            (ANY_VALUE(tmd.what_missing) IS NULL OR ANY_VALUE(tmd.what_missing) = '') AND
            (ANY_VALUE(tmd.what_learn) IS NULL OR ANY_VALUE(tmd.what_learn) = '') AND
            (ANY_VALUE(tmd.what_different) IS NULL OR ANY_VALUE(tmd.what_different) = '') AND
            (ANY_VALUE(tmd.what_done_when) IS NULL OR ANY_VALUE(tmd.what_done_when) = ''),
            '1',
            '0'
        ) AS CHAR
    ) AS fill,
    -- Calculate completed percentage
   CAST(
        CASE 
            WHEN ANY_VALUE(tmd.total_task) > 0 
            THEN ROUND((ANY_VALUE(tmd.total_completed_tasks) / NULLIF(ANY_VALUE(tmd.total_task), 0)) * 100, 2) 
            ELSE 0 
        END AS CHAR
    ) AS completed_percentage,
    -- Calculate uncompleted percentage
     CAST(
        CASE 
            WHEN ANY_VALUE(tmd.total_task) > 0 
            THEN ROUND((ANY_VALUE(tmd.total_uncompleted_tasks) / NULLIF(ANY_VALUE(tmd.total_task), 0)) * 100, 2) 
            ELSE 0 
        END AS CHAR
    ) AS uncompleted_percentage
FROM 
    tc_meeting_detail AS tmd
    LEFT JOIN tc_meeting AS tm ON tm.id = tmd.meeting_id
    LEFT JOIN users AS u ON u.id = tm.facilator
    LEFT JOIN mst_department AS md ON md.id = tm.mst_department_id
WHERE 
    tmd.is_deleted = 0 
   AND tmd.meeting_id = ? AND tmd.user_id = ?
GROUP BY 
    tmd.id, 
    tmd.date, 
    md.name, 
    u.first_name, 
    u.last_name,
     tmd.key_highlight, 
      tmd.key_action, 
     tmd.what_missing, 
    tmd.what_learn,
    tmd.what_different, 
    tmd.what_done_when,
     tmd.total_task,
    tmd.total_completed_tasks, 
    tmd.total_uncompleted_tasks 
ORDER BY 
    tm.id DESC;

`;

    db.query(sql, [id, user_id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res
          .status(200)
          .json({ message: "Record Fetched", error: false, data: result });
      }
    });
  },

  fetchopviewfaciltor: async function (req, res) {
    const { date: queryDateFromQuery, department: departmentFromQuery } =
      req.body || {};
    const { date: queryDateFromParams, department: departmentFromParams } =
      req.body || {};

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
    omd.id,
    omd.user_id,
    omd.meeting_id,
    COALESCE(omd.remark, '') as remark,
    COALESCE(omd.verified, '') as verified,
    omd.total_completed_tasks,
    omd.total_uncompleted_tasks,
    DATE_FORMAT(omd.date, '%Y-%m-%d') as formatted_date,
    COALESCE(u.first_name, '') as first_name, 
    COALESCE(u.last_name, '') as last_name,  
    COALESCE(u.profile_picture, '') as profile_picture,
    COALESCE(vu.first_name, '') AS verified_name
FROM 
    op_meeting_detail AS omd
LEFT JOIN 
    users AS u ON u.id = omd.user_id  
LEFT JOIN 
    users AS vu ON vu.id = omd.verified_by

WHERE 
    omd.is_deleted = 0 
    AND omd.meeting_id = ?
GROUP BY 
    omd.id;
`;

      db.query(sql2, [queryDate, department], function (err2, result2) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: {},
          });
        }

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
        });
      });
    });
  },

  getOperationalmeetingbyId: (req, res) => {
    const id = req.body.id;
    const user_id = req.body.user_id;

    var sql = `SELECT 
    omd.id,
    DATE_FORMAT(omd.date, '%e %M %Y') AS formatted_date,
    IFNULL(omd.clarity_1_key_highlight, '') AS clarity_1_key_highlight,
    IFNULL(omd.meeting_id, '') AS meeting_id,
    IFNULL(omd.clarity_1_key_action, '') AS clarity_1_key_action,
    IFNULL(omd.clarity_2_key_highlight, '') AS clarity_2_key_highlight,
    IFNULL(omd.clarity_2_key_action, '') AS clarity_2_key_action,
    IFNULL(omd.verified, '') AS verified,
    IFNULL(vu.first_name, '') AS verified_firstName,
    IFNULL(vu.last_name, '') AS verified_LastName,
    IFNULL(md.name, '') AS Departmentname,
    IFNULL(u.first_name, '') AS first_name,
    IFNULL(u.last_name, '') AS last_name,
    (
        SELECT  DATE_FORMAT(date, '%e %M %Y')
        FROM op_meeting
        WHERE id = (
            SELECT MAX(id)
            FROM op_meeting
            WHERE id < om.id
              AND mst_department_id = om.mst_department_id
        )
    ) AS Reported_date,
    GROUP_CONCAT(
        CASE 
            WHEN (t.assign_to = omd.user_id OR t.contributon = omd.user_id) 
                 AND DATE(t.due_date) = DATE(omd.date) THEN t.task
        END 
        ORDER BY t.task SEPARATOR ', '
    ) AS tasks_by_meeting,
    GROUP_CONCAT(
        CASE 
            WHEN (t.assign_to = omd.user_id OR t.contributon = omd.user_id) 
                 AND DATE(t.due_date) = DATE(omd.date) THEN t.status
        END 
        ORDER BY t.task SEPARATOR ', '
    ) AS tasks_by_meeting_status,
    GROUP_CONCAT(
        CASE 
            WHEN (t.assign_to = omd.user_id OR t.contributon = omd.user_id) 
                 AND DATE(t.due_date) = DATE(omd.date - INTERVAL 1 DAY) THEN t.task
        END 
        ORDER BY t.task SEPARATOR ', '
    ) AS prevdate_tasks,
    GROUP_CONCAT(
        CASE 
            WHEN (t.assign_to = omd.user_id OR t.contributon = omd.user_id) 
                 AND DATE(t.due_date) = DATE(omd.date - INTERVAL 1 DAY) THEN t.status
        END 
        ORDER BY t.task SEPARATOR ', '
    ) AS prevdate_tasks_status,
    COUNT(
          CASE 
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status != 1 THEN t.id
          END
      ) AS total_uncompleted_prevdate_tasks,
      COUNT(
          CASE 
              WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status = 1 THEN t.id
          END
      ) AS total_completed_prevdate_tasks,
      CASE 
        WHEN COUNT(
            CASE 
                WHEN t.due_date = omd.date - INTERVAL 1 DAY THEN t.id
            END
        ) = 0 THEN 0  
        ELSE 
             FLOOR((COUNT(
                CASE 
                    WHEN t.due_date = omd.date - INTERVAL 1 DAY AND t.status = 1 THEN t.id
                END
            ) / 
            (COUNT(
                CASE 
                    WHEN t.due_date = omd.date - INTERVAL 1 DAY THEN t.id
                END
            ) * 1.0)) * 100)
    END AS prevdate_task_completion_percentage,
        GROUP_CONCAT(
          CASE 
              WHEN DATE(t.due_date) = DATE(omd.date - INTERVAL 1 DAY) AND (t.contributon = omd.user_id or t.assign_to = omd.user_id) THEN t.id
          END
          ORDER BY t.task SEPARATOR ', '
      ) AS prev_task_ids,
        GROUP_CONCAT(
          CASE 
              WHEN DATE(t.due_date) = DATE(omd.date) AND (t.assign_to = omd.user_id or t.contributon = omd.user_id) THEN t.id
          END
          ORDER BY t.task SEPARATOR ', '
      ) AS today_task_ids
FROM 
    op_meeting_detail AS omd
LEFT JOIN op_meeting AS om 
    ON om.id = omd.meeting_id
LEFT JOIN users AS u 
    ON u.id = omd.facilator
LEFT JOIN users AS vu 
    ON vu.id = omd.verified_by
LEFT JOIN mst_department AS md 
    ON md.id = om.mst_department_id
LEFT JOIN todos AS t 
    ON (t.assign_to = omd.user_id OR t.contributon = omd.user_id)
    AND t.is_deleted = 0
    AND (DATE(t.due_date) = DATE(omd.date) OR DATE(t.due_date) = DATE(omd.date - INTERVAL 1 DAY))
WHERE 
    omd.is_deleted = 0  
    AND omd.meeting_id = ? and omd.user_id = ?
GROUP BY 
    omd.id, 
    omd.date, 
    omd.clarity_1_key_highlight,
    omd.clarity_1_key_action, 
    omd.clarity_2_key_highlight,
    omd.clarity_2_key_action, 
    omd.verified_by, 
    md.name, 
    u.first_name, 
    u.last_name, 
    omd.verified,
    vu.first_name, 
    vu.last_name`;

    db.query(sql, [id, user_id], (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        if (result.length === 0) {
          return res
            .status(200)
            .json({ message: "No Record Found", error: false, data: [] });
        }

        const resultData = result[0];

        // Helper function to safely map tasks
        const mapTasks = (tasks, taskIds, taskStatuses) => {
          if (!tasks || !taskIds || !taskStatuses) return []; // Return empty array if any value is missing

          const taskTitles = tasks.split(", ");
          const taskIdsArr = taskIds.split(", ");
          const taskStatusesArr = taskStatuses.split(", ");

          return taskTitles.map((task, index) => ({
            title: task,
            id: taskIdsArr[index] || null,
            status: taskStatusesArr[index] || null,
          }));
        };

        // Mapping the tasks_by_meeting and prev_tasks with their respective ids and statuses
        resultData.tasks_by_meeting = mapTasks(
          resultData.tasks_by_meeting,
          resultData.today_task_ids,
          resultData.tasks_by_meeting_status,
        );

        resultData.prev_tasks = mapTasks(
          resultData.prevdate_tasks,
          resultData.prev_task_ids,
          resultData.prevdate_tasks_status,
        );

        // Removing unnecessary fields
        delete resultData.tasks_by_meeting_status;
        delete resultData.prevdate_tasks_status;
        delete resultData.today_task_ids;
        delete resultData.prev_task_ids;

        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: [resultData],
        });
      }
    });
  },

  updateClaritydetails: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);
    const type = parseInt(this_data.type); // Get type from request
    const user_id = req?.user.id;

    console.log("ID received for update:", id, "Type:", type);

    if (!id || !type) {
      return res
        .status(400)
        .json({ error: true, message: "Invalid ID or Type", data: {} });
    }

    // Fetch existing data first
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id FROM `op_meeting_detail` WHERE `meeting_id` = ? and user_id = ?";

    db.query(selectSql, [id, user_id], (err, result) => {
      if (err) {
        console.error("Database select error:", err);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Meeting details not found or already deleted.",
          data: {},
        });
      }

      const existingData = result[0]; // Get existing row from DB
      const user_id = req?.user?.id;
      const meetingDate = result.length > 0 ? result[0].formatted_date : null;
      const employeeId = result.length > 0 ? result[0].user_id : null;

      let updateFields = [];
      let updateValues = [];

      if (type === 1) {
        updateFields.push("`clarity_1_key_highlight` = ?");
        updateFields.push("`clarity_1_key_action` = ?");
        updateValues.push(
          this_data.key_highlight || existingData.key_highlight,
        );
        updateValues.push(this_data.key_action || existingData.key_action);
      } else if (type === 2) {
        updateFields.push("`clarity_2_key_highlight` = ?");
        updateFields.push("`clarity_2_key_action` = ?");
        updateValues.push(
          this_data.key_highlight || existingData.key_highlight,
        );
        updateValues.push(this_data.key_action || existingData.key_action);
      } else {
        return res
          .status(400)
          .json({ error: true, message: "Invalid type provided", data: {} });
      }

      // Common fields
      updateFields.push("`updated_at` = ?");
      updateFields.push("`updated_by` = ?");
      updateValues.push(getCurrentDateAndTime());
      updateValues.push(parseInt(user_id));

      // updateValues.push(id);
      updateValues.push(employeeId);
      updateValues.push(meetingDate);

      const updateSql = `UPDATE \`op_meeting_detail\` SET ${updateFields.join(
        ", ",
      )} WHERE user_id = ? AND DATE(date) = ?`;

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          console.error("Database update error:", err);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Failed to update, no changes made.",
            data: {},
          });
        }

        res.status(200).json({
          error: false,
          message: "Clarity has been updated successfully.",
          data: { id },
        });
      });
    });
  },

  verifiedmeeting: function (req, res) {
    const taskid = req.body.id;
    const id = req.user.id;
    const remark = req.body.remark;

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
        res.status(200).json({
          error: false,
          message: "task has been marked as verified!",
        });
      }
    });
  },

  fetchtacticalviewfacilator: (req, res) => {
    try {
      const { date: queryDateFromQuery, department: departmentFromQuery } =
        req.body || {};
      const { date: queryDateFromParams, department: departmentFromParams } =
        req.body || {};

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
  tmd.id,
  tmd.meeting_id,
  tmd.user_id,
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

  getMobileStrategicDates: (req, res) => {
    try {
      var sql = `
SELECT DISTINCT date, DATE_FORMAT(date, '%e %M %Y') AS formatted_date
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

  fetchStrategicforAdmin: async function (req, res) {
    const { date } = req.body;
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
      tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));
              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,
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

  fetchStrategicforEmp: (req, res) => {
    const user_id = req?.body?.user_id;
    const { date } = req.body;

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
      tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,
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

  fetchStrategicforHod: (req, res) => {
    const user_id = req?.user?.id;
    const { date } = req.body;

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
tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,
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

  fetchStrategicbyid: (req, res) => {
    const id = req?.body?.id;
    const user_id = req.body.user_id;

    var sql = `
SELECT 
  tm.id,
  DATE_FORMAT(tm.date, '%e %M %Y') AS formatted_date,
  COALESCE(md.name, '') AS Departmentname,
  COALESCE(u.first_name, '') AS first_name,
  COALESCE(u.last_name, '') AS last_name,
   COALESCE(tmd.task_mark, '') AS task_mark,
   COALESCE(tmd.attendance, '') AS attendance,
   COALESCE(tmd.software, '') AS software,
   COALESCE(tmd.conflict, '') AS conflict,
   COALESCE(tmd.meeting, '') AS meeting,
  COALESCE(tmd.collabation, '') AS collabation,
  COALESCE(tmd.total_marks_data, '') AS total_marks_data,
  COALESCE(tmd.task_percentage, '') AS task_percentage,
  COALESCE(tmd.attendance_percentage, '') AS attendance_percentage,
  COALESCE(tmd.soft_percent, '') AS soft_percent,
  COALESCE(tmd.meeting_percent, '') AS meeting_percent,
  COALESCE(tmd.collbration_per, '') AS collbration_per,
  COALESCE(tmd.con_percent, '') AS con_percent,
  COALESCE(tmd.total_completed_tasks, '') AS total_completed_tasks,
  COALESCE(tmd.total_uncompleted_tasks, '') AS total_uncompleted_tasks,
  COALESCE(tmd.total_task, '') AS total_task,
  COALESCE(tmd.what_did_u_well, '') AS what_did_u_well,
  COALESCE(tmd.what_did_u_not_well, '') AS what_did_u_not_well,
  COALESCE(tmd.what_can_u_do_diff, '') AS what_can_u_do_diff
FROM st_meeting AS tm
LEFT JOIN users u ON u.id = tm.facilator
LEFT JOIN st_meeting_detail AS tmd ON tmd.meeting_id = tm.id
LEFT JOIN mst_department md ON md.id = tm.mst_department_id
WHERE tm.is_deleted = 0 AND tmd.meeting_id = ? AND tmd.user_id = ?
GROUP BY tm.id, tm.date, md.name, u.first_name, u.last_name, tmd.total_marks_data,tmd.task_mark,tmd.attendance,tmd.software,tmd.conflict,tmd.meeting,tmd.collabation,tmd.total_marks_data,tmd.task_percentage,tmd.attendance_percentage,tmd.soft_percent,tmd.meeting_percent,tmd.collbration_per,tmd.con_percent,tmd.total_completed_tasks,tmd.total_uncompleted_tasks,tmd.total_task,tmd.what_did_u_well,tmd.what_did_u_not_well,tmd.what_can_u_do_diff
ORDER BY tm.id DESC
`;

    db.query(sql, [id, user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          result = result.map((row) => ({
            ...row,
          }));

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
  },

  fetchStrategicviewbyid: (req, res) => {
    try {
      const { date: queryDateFromQuery, department: departmentFromQuery } =
        req.body || {};
      const { date: queryDateFromParams, department: departmentFromParams } =
        req.body || {};

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

        var sql = `select st.id,
        st.meeting_id,
        u.id as userId,
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

  updateMobileStrategicPerformance: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.editId);
    const user_id = req?.user.id;

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql =
      "SELECT id,DATE_FORMAT(date, '%Y-%m-%d') AS formatted_date,user_id,what_did_u_well,what_did_u_not_well,what_can_u_do_diff FROM `st_meeting_detail` WHERE `meeting_id` = ? and user_id = ?";

    db.query(selectSql, [id, user_id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Meeting details not found or already deleted.",
          data: {},
        });
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

  //  Expense
  getDepositExpenseForAdmin: (req, res) => {
    var sql = `SELECT 
                  de.id, 
                  IFNULL(de.description, '') AS description, 
                  IFNULL(de.amount, '') AS amount, 
                  IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
                  IFNULL(u.first_name, '') AS first_name, 
                  IFNULL(u.last_name, '') AS last_name, 
                  IFNULL(u.profile_picture, '') AS profile_picture
              FROM deposit_expense AS de
              LEFT JOIN users AS u ON u.id = de.team_id
              WHERE de.isdeleted = 0 and de.expense_type =1  AND MONTH(de.date) = MONTH(CURDATE()) AND YEAR(de.date) = YEAR(CURDATE())`;

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: result.length > 0 ? result : [],
        });
      }
    });
  },

  addDepositexpense: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const deposit = {
      date: this_data.date,
      amount: this_data.amount,
      team_id: this_data.team_id,
      description: this_data.description,
      expense_type: 1,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      isdeleted: 0,
    };

    db.query(
      "INSERT INTO deposit_expense SET ?",
      deposit,
      function (err, result) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage });
        }

        const data = {
          error: false,
          message: "deposit expense  has been added successfully.",
        };
        res.status(201).json(data);
      },
    );
  },
  addProjectexpense: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const deposit = {
      date: this_data.date,
      amount: this_data.amount,
      mst_file_id: this_data.mst_file_id,
      team_id: user_id,
      description: this_data.description,
      expense_type: 2,
      receipt_image: this_data.receipt_image,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      isdeleted: 0,
    };

    db.query(
      "INSERT INTO deposit_expense SET ?",
      deposit,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "project expense  has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  uploadfilexpense: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }
    // Process uploaded files
    const files = [];
    let receipt_image = "";
    // let review_by_sign = "";
    const unnecessary_files = [];

    req.files.forEach((file) => {
      if (file.fieldname === "receipt_image") {
        receipt_image = getImageWithFoldername(file.path);
        files.push(receipt_image);
      } else {
        unlinkImage(file.path);
      }
    });
    console.log("ckient--->", receipt_image);
    // console.log("authorized--->", review_by_sign);

    // Check for client signature
    if (!receipt_image) {
      // Remove unnecessary files
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the client signature.",
        data: {},
      });
    }

    const expense = {
      receipt_image: receipt_image,
    };

    const data = {
      error: false,
      message: "upload image successfully.",
      data: receipt_image,
    };
    res.status(201).json(data);
    // });
  },
  getProjectExpenseForAdmin: (req, res) => {
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const is_approved = req?.body?.status || null;
    const mst_file_id = req?.body?.mst_file_id || null;

    let where =
      " WHERE de.isdeleted = 0 AND de.expense_type = 2  AND MONTH(de.date) = MONTH(CURDATE()) AND YEAR(de.date) = YEAR(CURDATE())";
    let values = [];

    if (is_approved) {
      where += " AND de.is_approved = ?";
      values.push(is_approved);
    }
    if (fromdate && todate) {
      where += " AND DATE(de.date) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    }
    if (mst_file_id) {
      where += " AND de.mst_file_id = ?";
      values.push(mst_file_id);
    }

    const baseURL = "https://webappapi.zaidexceldesign.com/public/";
    var sql = `SELECT 
        de.id, 
        IFNULL(de.description, '') AS description, 
        IFNULL(de.amount, '') AS amount, 
        IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
       IFNULL(CONCAT('${baseURL}', de.receipt_image), '') AS receipt_image,
        IFNULL(nmf.case_id, '') AS case_id,
          IFNULL(de.is_approved, '') AS status,
        IFNULL(u.first_name, '') AS client_name
    FROM deposit_expense AS de
    LEFT JOIN new_mst_file AS nmf ON nmf.id = de.mst_file_id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    ${where}
    ORDER BY de.id DESC;`;

    db.query(sql, values, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: result.length > 0 ? result : [],
        });
      }
    });
  },

  addOfficeexpense: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const deposit = {
      date: this_data.date,
      amount: this_data.amount,
      description: this_data.description,
      expense_type: 3,
      team_id: user_id,
      receipt_image: this_data.receipt_image,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      isdeleted: 0,
    };

    db.query(
      "INSERT INTO deposit_expense SET ?",
      deposit,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "office expense  has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
        res.status(201).json(data);
      },
    );
  },

  getOfficeExpenseForAdmin: (req, res) => {
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const is_approved = req?.body?.status || null;

    let where =
      " WHERE de.isdeleted = 0 AND de.expense_type = 3 AND MONTH(de.date) = MONTH(CURDATE()) AND YEAR(de.date) = YEAR(CURDATE())";
    let values = [];
    if (is_approved) {
      where += " AND de.is_approved = ?";
      values.push(is_approved);
    }
    if (fromdate && todate) {
      where += " AND DATE(de.date) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    }

    const baseURL = "http://62.72.30.155:7600/public/";
    var sql = `SELECT 
    de.id, 
    IFNULL(de.description, '') AS description, 
    IFNULL(de.amount, '') AS amount, 
    IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
 IFNULL(CONCAT('${baseURL}', de.receipt_image), '') AS receipt_image
 FROM deposit_expense AS de
  ${where}
    ORDER BY de.id DESC`;

    db.query(sql, values, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: result.length > 0 ? result : [],
        });
      }
    });
  },

  // site inspection
  getsitesapp: async function (req, res) {
    const team_id = req?.body?.team_id || null;
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const category_id = req?.body?.category_id || null;
    const file_id = req?.body?.file_id || null;

    let where =
      " WHERE si.is_deleted = 0 AND MONTH(si.created_at) = MONTH(CURDATE()) AND YEAR(si.created_at) = YEAR(CURDATE())";

    let values = []; // For parameterized queries

    if (team_id) {
      where += " AND si.created_by = ?";
      values.push(team_id);
    }
    if (fromdate && todate) {
      where += " AND DATE(si.created_at) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    }
    if (category_id) {
      where += " AND si.mst_type_id = ?";
      values.push(category_id);
    }
    if (file_id) {
      where += " AND si.mst_file_project_id = ?";
      values.push(file_id);
    }

    let sql = `
    SELECT 
        si.id,
        IFNULL(DATE_FORMAT(si.created_at, '%e-%M-%Y'), '') AS formatted_date, 
        IFNULL(nmf.case_id, '') AS case_id, 
         IFNULL(cu.first_name, '') AS client_name,
         IFNULL(md.name,'') AS department,
        IFNULL(mt.type_name, '') AS category_name
    FROM site_inspection AS si
    LEFT JOIN new_mst_file AS nmf ON nmf.id = si.mst_file_project_id
    LEFT JOIN mst_type AS mt ON mt.id = si.mst_type_id
    LEFT JOIN users AS cu ON cu.id = nmf.client_id
    left join mst_department as md on md.id = si.department
    ${where} 
    ORDER BY si.id DESC;`;

    db.query(sql, values, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, siteinspection: {} });
      }
      return res.status(200).json({
        error: false,
        message:
          result.length > 0 ? "Record fetched successfully" : "Not found",
        siteinspection: result.length > 0 ? result : [],
      });
    });
  },

  getsitesbyidapp: (req, res) => {
    try {
      const id = req.body?.id;

      if (parseInt(id) != NaN) {
        var sql = `SELECT 
    si.id,
    IFNULL(DATE_FORMAT(si.created_at, '%e-%M-%Y'), '') AS formatted_date, 
    IFNULL(nmf.case_id, '') AS case_id, 
    IFNULL(mt.type_name, '') AS category_name,
    IFNULL(cu.first_name, '') AS client_name,
    IFNULL(cu.company_name, '') AS company_name,
    IFNULL(nmf.long, '') AS longitude,
    IFNULL(mici.title, '') AS visit_work,
    IFNULL(si.key_observation, '') AS key_observation,
    IFNULL(si.remarks, '') AS remarks,
          IFNULL(md.name,'') AS department,
    IFNULL(si.client_sign, '') AS client_sign,
    IFNULL(si.review_by_sign, '') AS review_by_sign,  -- Fixed column alias
    IFNULL(u.first_name, '') AS site_incharge,
    IFNULL(mpt.title, '') AS project_type,
    IFNULL(nmf.address, '') AS address,
    IFNULL(nmf.google_location, '') AS google_location,
    IFNULL(nmf.lat, '') AS latitude  -- Fixed column alias
FROM site_inspection AS si
LEFT JOIN new_mst_file AS nmf ON nmf.id = si.mst_file_project_id
LEFT JOIN mst_type AS mt ON mt.id = si.mst_type_id
LEFT JOIN users AS cu ON cu.id = nmf.client_id
 left join mst_department as md on md.id = si.department
LEFT JOIN users AS u ON u.id = si.review_by
LEFT JOIN mst_inspection_checklist AS mici ON mici.id = si.mst_inspection_checklist_id
LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.project_type  -- Fixed JOIN syntax
WHERE  si.id = ?
ORDER BY si.id DESC;`;
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

  getFirebaseLiveLocations: async () => {
    const todayFormatted = moment().format("DD-MM-YYYY");
    const refPath = `employee_live_locations/${todayFormatted}`;
    const dbRef = admin.database().ref(refPath);

    const snapshot = await dbRef.once("value");
    const latestMap = {};

    const data = snapshot.val();
    if (!data) return [];

    Object.keys(data).forEach((userId) => {
      const locationData = data[userId]?.location;
      if (locationData) {
        const entries = Object.values(locationData);
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          latestMap[userId] = {
            user_id: Number(lastEntry.user_id),
            first_name: String(lastEntry.name || ""),
            latitude: String(lastEntry.latitude || ""),
            longitude: String(lastEntry.longitude || ""),
          };
        }
      }
    });
    console.log("latestMap", latestMap);
    return Object.values(latestMap); // Only latest entry per user
  },

  getDashboardforadmin: async (req, res) => {
    const queries = {
      projectQuery: `
        SELECT 
          CAST(SUM(CASE WHEN nmfpd.application_name = 'approval_process' THEN 1 ELSE 0 END) AS CHAR) AS approval_process_count,
          CAST(SUM(CASE WHEN nmfpd.application_name = 'interior_design' THEN 1 ELSE 0 END) AS CHAR) AS interior_design_count,
          CAST(SUM(CASE WHEN nmfpd.application_name = 'architecture_design' THEN 1 ELSE 0 END) AS CHAR) AS architecture_design_count
        FROM new_mst_file AS nmf
        LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        WHERE nmfpd.is_deleted = 0;
      `,

      tentativeQuery: `
        SELECT 
          CAST(SUM(CASE WHEN nmfpd.application_name = 'approval_process' THEN 1 ELSE 0 END) AS CHAR) AS approval_process_count,
          CAST(SUM(CASE WHEN nmfpd.application_name = 'interior_design' THEN 1 ELSE 0 END) AS CHAR) AS interior_design_count,
          CAST(SUM(CASE WHEN nmfpd.application_name = 'architecture_design' THEN 1 ELSE 0 END) AS CHAR) AS architecture_design_count
        FROM new_mst_file AS nmf
        LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        WHERE nmfpd.is_deleted = 0 AND nmf.tentative_design = "yes";
      `,

      attendanceQuery: `
        SELECT 
          CAST(COUNT(DISTINCT CASE WHEN (att_type IS NULL OR att_type = 2) AND DATE(attendance.date) = CURDATE() THEN attendance.user_id END) AS CHAR) AS present_count,
          CAST(COUNT(DISTINCT u.id) AS CHAR) AS total_employees
        FROM users AS u
        LEFT JOIN attendance ON u.id = attendance.user_id
        LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
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
        SELECT 
          CAST(COUNT(u.id) AS CHAR) AS total_client
        FROM users AS u
        LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
        WHERE u.isdeleted = 0 AND ug.mst_group_id = 4 AND u.active = 0;
      `,

      siteinspectionQuery: `
        SELECT CAST(COUNT(*) AS CHAR) AS total_siteinspection
        FROM site_inspection
        WHERE is_deleted = 0 
        AND MONTH(created_at) = MONTH(CURDATE()) 
        AND YEAR(created_at) = YEAR(CURDATE());
      `,

      depositQuery: `
        SELECT CAST(SUM(amount) AS CHAR) AS total_amount
        FROM deposit_expense
        WHERE isdeleted = 0 
        AND expense_type = 1
        AND MONTH(date) = MONTH(CURDATE()) 
        AND YEAR(date) = YEAR(CURDATE());
      `,

      projectExpenseQuery: `
        SELECT CAST(SUM(amount) AS CHAR) AS total_amount
        FROM deposit_expense
        WHERE isdeleted = 0 
        AND expense_type = 2
        AND MONTH(date) = MONTH(CURDATE()) 
        AND YEAR(date) = YEAR(CURDATE());
      `,

      officeQuery: `
        SELECT CAST(SUM(amount) AS CHAR) AS total_amount
        FROM deposit_expense
        WHERE isdeleted = 0 
        AND expense_type = 3
        AND MONTH(date) = MONTH(CURDATE()) 
        AND YEAR(date) = YEAR(CURDATE());
      `,

      leaveQuery: `SELECT COUNT(*) AS total
FROM attendance
WHERE att_type IN (2, 3)
  AND is_deleted = 0
  AND (status IS NULL OR status = '')`,

      escrowIncomeQuery: `SELECT SUM(amount) AS total
FROM escrow_income
WHERE is_deleted = 0`,

      escrowExpenseQuery: `SELECT SUM(amount) AS total
FROM escrow_expense
WHERE is_deleted = 0`,

      ReceiptsQuery: `SELECT SUM(amount) AS total
FROM receipts
WHERE is_deleted = 0`,

      PaymentsQuery: `SELECT SUM(amount) AS total
FROM payments_expense
WHERE is_deleted = 0`,

      ProjectPriceQuery: `SELECT application_name, SUM(price) AS total
FROM new_mst_file_project_details
WHERE is_deleted = 0
  AND application_name IN ('approval_process', 'architecture_design', 'interior_design')
GROUP BY application_name`,
    };

    const replaceNullWithZero = (data) => {
      return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value ?? "0"]),
      );
    };

    db.query(queries.projectQuery, (err, projectResults) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Project Query Failed", error: true });

      db.query(queries.tentativeQuery, (err, tentativeResults) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Tentative Query Failed", error: true });

        db.query(queries.attendanceQuery, (err, attendanceResults) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Attendance Query Failed", error: true });

          db.query(queries.taskQuery, (err, taskResults) => {
            if (err)
              return res
                .status(500)
                .json({ message: "Task Query Failed", error: true });

            db.query(queries.clientQuery, (err, clientResults) => {
              if (err)
                return res
                  .status(500)
                  .json({ message: "Client Query Failed", error: true });

              db.query(queries.siteinspectionQuery, (err, siteResults) => {
                if (err)
                  return res.status(500).json({
                    message: "Site Inspection Query Failed",
                    error: true,
                  });

                db.query(queries.depositQuery, (err, depositResults) => {
                  if (err)
                    return res
                      .status(500)
                      .json({ message: "Deposit Query Failed", error: true });

                  db.query(
                    queries.projectExpenseQuery,
                    (err, projectExpenseResults) => {
                      if (err)
                        return res.status(500).json({
                          message: "Project Expense Query Failed",
                          error: true,
                        });

                      db.query(
                        queries.officeQuery,
                        async (err, officeResults) => {
                          if (err)
                            return res.status(500).json({
                              message: "Office Query Failed",
                              error: true,
                            });

                          db.query(
                            queries.leaveQuery,
                            async (err, leaveResults) => {
                              if (err)
                                return res.status(500).json({
                                  message: "Leave Query Failed",
                                  error: true,
                                });

                              db.query(
                                queries.escrowIncomeQuery,
                                async (err, esIncResults) => {
                                  if (err)
                                    return res.status(500).json({
                                      message: "es income Query Failed",
                                      error: true,
                                    });
                                  db.query(
                                    queries.escrowExpenseQuery,
                                    async (err, esExResults) => {
                                      if (err)
                                        return res.status(500).json({
                                          message: "es Expense Query Failed",
                                          error: true,
                                        });
                                      db.query(
                                        queries.ReceiptsQuery,
                                        async (err, receiptResults) => {
                                          if (err)
                                            return res.status(500).json({
                                              message: "Receipt Query Failed",
                                              error: true,
                                            });
                                          db.query(
                                            queries.PaymentsQuery,
                                            async (err, paymentResults) => {
                                              if (err)
                                                return res.status(500).json({
                                                  message:
                                                    "Payment Query Failed",
                                                  error: true,
                                                });

                                              db.query(
                                                queries.ProjectPriceQuery,
                                                async (
                                                  err,
                                                  projectPriceResults,
                                                ) => {
                                                  if (err)
                                                    return res
                                                      .status(500)
                                                      .json({
                                                        message:
                                                          "Project Price Query Failed",
                                                        error: true,
                                                      });

                                                  const firebaseLocations =
                                                    await module.exports.getFirebaseLiveLocations();

                                                  const response = {
                                                    projectData:
                                                      replaceNullWithZero(
                                                        projectResults[0],
                                                      ),
                                                    tentativeData:
                                                      replaceNullWithZero(
                                                        tentativeResults[0],
                                                      ),
                                                    trackTeamData:
                                                      firebaseLocations,
                                                    attendanceData:
                                                      replaceNullWithZero(
                                                        attendanceResults[0],
                                                      ),
                                                    taskData:
                                                      replaceNullWithZero(
                                                        taskResults[0],
                                                      ),
                                                    clientData:
                                                      replaceNullWithZero(
                                                        clientResults[0],
                                                      ),
                                                    siteData:
                                                      replaceNullWithZero(
                                                        siteResults[0],
                                                      ),
                                                    depositData:
                                                      replaceNullWithZero(
                                                        depositResults[0],
                                                      ),
                                                    projectExpenseData:
                                                      replaceNullWithZero(
                                                        projectExpenseResults[0],
                                                      ),
                                                    officeData:
                                                      replaceNullWithZero(
                                                        officeResults[0],
                                                      ),
                                                    leaveData:
                                                      replaceNullWithZero(
                                                        leaveResults[0],
                                                      ),
                                                    esIncomeData:
                                                      replaceNullWithZero(
                                                        esIncResults[0],
                                                      ),
                                                    esExpenseData:
                                                      replaceNullWithZero(
                                                        esExResults[0],
                                                      ),
                                                    ReceiptsData:
                                                      replaceNullWithZero(
                                                        receiptResults[0],
                                                      ),
                                                    PaymentsData:
                                                      replaceNullWithZero(
                                                        paymentResults[0],
                                                      ),
                                                    ProjectPriceData:
                                                      replaceNullWithZero(
                                                        projectPriceResults,
                                                      ),
                                                  };

                                                  res.status(200).json({
                                                    message: "Record fetched",
                                                    error: false,
                                                    data: response,
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
                        },
                      );
                    },
                  );
                });
              });
            });
          });
        });
      });
    });
  },
  fetchAttendanceSummaryforAdmin: async function (req, res) {
    const { date } = req.body;

    let where = " WHERE a.is_deleted = 0";
    let values = [];

    if (!date) {
      where += " AND DATE(a.date) = CURDATE()";
    } else {
      where += " AND DATE(a.date) = ?";
      values.push(date);
    }

    const sql = `
    SELECT 
      a.*, 
      IFNULL(DATE_FORMAT(a.date, '%e-%M-%Y'), '') AS formatted_date, 
      TIME_FORMAT(a.checkin, '%h:%i %p')          AS formatted_checkin, 
      TIME_FORMAT(a.checkout, '%h:%i %p')         AS formatted_checkout, 
      IFNULL(TIMESTAMPDIFF(MINUTE, a.breakin, a.breakout), 0) AS total_break_minutes,
      COALESCE(u.first_name, '') AS first_name, 
      COALESCE(u.last_name, '')  AS last_name,
      COALESCE(u.profile_picture, '')  AS profile_picture
    FROM attendance AS a 
    LEFT JOIN users AS u ON u.id = a.user_id  
    ${where}
    ORDER BY a.checkin DESC
  `;

    db.query(sql, values, function (err, result) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(200).send({
        error: false,
        message: "Attendance summary fetched successfully",
        data: result,
      });
    });
  },
  fetchAllAttendanceforAdmin: async function (req, res) {
    const { team_id, month } = req.body;

    const hasTeam = team_id && team_id !== "" && team_id !== null;
    const hasMonth = month && month !== "" && month !== null;

    let where = " WHERE a.is_deleted = 0";
    let values = [];

    let pmsWhere = " WHERE 1=1";
    let pmsValues = [];

    if (hasTeam) {
      where += " AND a.user_id = ?";
      values.push(team_id);

      pmsWhere += " AND p.created_by = ?";
      pmsValues.push(team_id);
    }

    if (hasMonth) {
      // expects month in "YYYY-MM" format, e.g. "2026-08"
      const [yearPart, monthPart] = String(month).split("-");
      const selectedYear = parseInt(yearPart);
      const selectedMonth = parseInt(monthPart);

      const monthPadded = String(selectedMonth).padStart(2, "0");
      const startDate = `${selectedYear}-${monthPadded}-01`;
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      const nextMonthPadded = String(nextMonth).padStart(2, "0");
      const endDate = `${nextYear}-${nextMonthPadded}-01`;

      where += " AND a.date >= ? AND a.date < ?";
      values.push(startDate, endDate);

      // NOTE: adjust p.created_at below if pms uses a different date column (e.g. p.date, p.entry_date)
      pmsWhere += " AND p.created_at >= ? AND p.created_at < ?";
      pmsValues.push(startDate, endDate);
    }

    if (!hasTeam && !hasMonth) {
      where += " AND DATE(a.date) = CURDATE()";
      pmsWhere += " AND DATE(p.created_at) = CURDATE()";
    }

    const sql = `
    SELECT 
      a.*, 
      IFNULL(DATE_FORMAT(a.date, '%e-%M-%Y'), '') AS formatted_date, 
      TIME_FORMAT(a.checkin, '%h:%i %p')          AS formatted_checkin, 
      TIME_FORMAT(a.checkout, '%h:%i %p')         AS formatted_checkout, 
      IFNULL(TIMESTAMPDIFF(MINUTE, a.breakin, a.breakout), 0) AS total_break_minutes,
      COALESCE(u.first_name, '') AS first_name, 
      COALESCE(u.last_name, '')  AS last_name
    FROM attendance AS a 
    LEFT JOIN users AS u ON u.id = a.user_id  
    ${where}
    ORDER BY a.checkin DESC
  `;

    const countSql = `
    SELECT 
      att.present_count,
      att.half_day_count,
      att.full_leave_count,
      att.absent_count,
      att.used_leave_count,
      att.total_days,
      att.general_hours,
      IFNULL(pms.pms_hours, 0) AS pms_hours
    FROM (
      SELECT 
        SUM(CASE WHEN a.att_type = 1           THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.att_type = 2           THEN 1 ELSE 0 END) AS half_day_count,
        SUM(CASE WHEN a.att_type = 3           THEN 1 ELSE 0 END) AS full_leave_count,
        SUM(CASE WHEN a.att_type = 4           THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.att_type IN (2, 3)     THEN 1 ELSE 0 END) AS used_leave_count,
        COUNT(*) AS total_days,
        ROUND(SUM(TIMESTAMPDIFF(SECOND, a.checkin, a.checkout)) / 3600, 2) AS general_hours
      FROM attendance AS a
      LEFT JOIN users AS u ON u.id = a.user_id
      ${where}
    ) AS att
    LEFT JOIN (
      SELECT ROUND(SUM(p.hours)) AS pms_hours
      FROM pms AS p
      ${pmsWhere}
    ) AS pms ON 1=1
  `;

    db.query(sql, values, function (err, result) {
      if (err) {
        return res
          .status(500)
          .send({ error: true, message: err.sqlMessage, data: [] });
      }

      const formattedResult = result.map((row) => {
        Object.keys(row).forEach((key) => {
          row[key] = row[key] !== null ? String(row[key]) : "";
        });
        return row;
      });

      db.query(
        countSql,
        [...values, ...pmsValues],
        function (err, countResult) {
          if (err) {
            return res
              .status(500)
              .send({ error: true, message: err.sqlMessage, data: [] });
          }

          const counts = countResult[0] || {};

          const summary = {
            total_days: parseInt(counts.total_days) || 0,
            present_count: parseInt(counts.present_count) || 0,
            half_day_count: parseInt(counts.half_day_count) || 0,
            full_leave_count: parseInt(counts.full_leave_count) || 0,
            absent_count: parseInt(counts.absent_count) || 0,
            used_leave_count: parseInt(counts.used_leave_count) || 0,
            general_hours: parseFloat(counts.general_hours) || 0,
            pms_hours: parseFloat(counts.pms_hours) || 0,
          };

          return res.status(200).send({
            error: false,
            message:
              formattedResult.length > 0
                ? "Record fetched successfully"
                : "No records found",
            data: formattedResult,
            summary: summary,
          });
        },
      );
    });
  },
  fetchAllLeaveforAdmin: (req, res) => {
    try {
      var sql = `
    SELECT 
      a.id, 
      IFNULL(DATE_FORMAT(a.date, '%e-%M-%Y'), '') AS formatted_date,
        IFNULL(a.notes,  '') AS notes,  
      IFNULL(a.reason,  '') AS reason, 
       IFNULL(u.first_name,  '') AS first_name,
       IFNULL(u.last_name,  '') AS last_name,
     IFNULL(u.profile_picture,  '') AS profile_picture,
       IFNULL(a.status,  '') AS status,
      CASE 
        WHEN a.att_type = 3 THEN 'Full Day' 
        WHEN a.att_type = 2 THEN 'Half Day' 
        ELSE 'Unknown' 
      END AS leave_type 
    FROM attendance AS a
    LEFT JOIN users AS u ON u.id = a.user_id
    WHERE a.is_deleted = 0 
    AND (a.att_type = 3 OR a.att_type = 2)
    order by a.id desc`;

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

  fetchAllTeam: (req, res) => {
    try {
      var sql = `
        SELECT 
            u.id,
            IFNULL(u.first_name, '') AS first_name,
            IFNULL(u.last_name, '') AS last_name,
            IFNULL(u.profile_picture, '') AS profile_picture,
            IFNULL(GROUP_CONCAT(DISTINCT md.name SEPARATOR ', '), '') AS department_names
        FROM users AS u
        LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
        LEFT JOIN user_department_post AS udp ON udp.user_id = u.id
        LEFT JOIN mst_department AS md ON md.id = udp.department_id
        WHERE u.isdeleted = 0 AND ug.mst_group_id = 2 and u.active = 1
        GROUP BY u.id order by u.first_name asc`;

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          // Format department names as an array
          result = result.map((user) => ({
            ...user,
            department_names: user.department_names
              ? user.department_names.split(", ")
              : [],
          }));

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
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  fetchAllTaskbyteamidforadmin: (req, res) => {
    const user_id = req?.body?.id;

    // Using a parameterized query to prevent SQL injection
    const taskSql = `
   SELECT 
      t.id,
   COUNT(t.id) AS total_tasks,
  COUNT(CASE WHEN t.status = 1 THEN 1 END) AS completed_tasks,
      COUNT(CASE WHEN t.status != 1 THEN 1 END) AS uncompleted_tasks,
      t.userid,
      t.due_date,
      t.priority,
      t.assign_to,
      t.contributon,
      t.task,
          t.verified_by,
          t.verified,
      t.project_id,
      t.status,
      nmf.case_id AS project,
       GROUP_CONCAT(DISTINCT at.profile_picture) AS assign_to_profiles,
           GROUP_CONCAT(DISTINCT cu.profile_picture) AS contribution_profiles
  FROM 
      todos AS t
  LEFT JOIN 
      new_mst_file AS nmf 
  ON 
      nmf.id = t.project_id
      LEFT JOIN users AS at
  ON FIND_IN_SET(at.id, REPLACE(REPLACE(REPLACE(t.assign_to, '[', ''), ']', ''), ')', '')) > 0
  LEFT JOIN users AS cu
  ON FIND_IN_SET(cu.id, REPLACE(REPLACE(REPLACE(t.contributon, '[', ''), ']', ''), ')', '')) > 0
  WHERE 
      t.is_deleted = 0 
      and t.assign_to = ?
  GROUP BY 
      t.due_date, 
      t.id, 
      t.userid, 
      t.priority, 
      t.assign_to,
      t.contributon, 
      t.task,
      t.verified_by, 
      t.verified,
      t.project_id, 
      t.status, 
      nmf.case_id
      ORDER BY 
      t.due_date DESC;
    `;

    db.query(taskSql, [user_id], (taskErr, taskResults) => {
      if (taskErr) {
        return res
          .status(500)
          .json({ message: taskErr.sqlMessage, error: true, data: {} });
      }

      const groupedData = taskResults.reduce((acc, curr) => {
        // Format the date using moment.js
        const formattedDate = moment(curr.due_date).format("D MMM YYYY");
        const completedtasks = String(curr.completed_tasks || "");
        const uncompletedtasks = String(curr.uncompleted_tasks || "");
        const verified = String(curr.verified || "");
        const verified_by = String(curr.verified_by || "");

        // Determine priority color
        let priorityColor;
        if (curr.priority === "1") {
          priorityColor = "red";
        } else if (curr.priority === "2") {
          priorityColor = "yellow";
        } else if (curr.priority === "3") {
          priorityColor = "green";
        }

        // Group tasks by formatted date
        if (!acc[formattedDate]) {
          acc[formattedDate] = {
            date: formattedDate,
            completedtasks: completedtasks,
            uncompletedtasks: uncompletedtasks,
            verified: verified,
            verified_by: verified_by,
            tasksDetail: [],
          };
        }
        acc[formattedDate].tasksDetail.push({
          date: formattedDate,
          id: String(curr.id || ""), // Convert to string
          userid: String(curr.userid || ""), // Convert to string
          priority: curr.priority || "", // Already string
          contributon: curr.contributon || "", // Already string
          projectId: String(curr.project_id || ""), // Convert to string
          task: curr.task || "",
          status: String(curr.status || ""),
          assign_to: curr.assign_to || "",
          project: curr.project || "",
          assign_to_profile: curr.assign_to_profiles
            ? curr.assign_to_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
          contribution_profile: curr.contribution_profiles
            ? curr.contribution_profiles
                .split(",")
                .map((profile) => `http://62.72.30.155:7600/${profile}`) // Convert to array and prepend URL
            : [],
        });
        return acc;
      }, {});

      // const responseData = {
      //   tasks: Object.values(groupedData),
      // };

      res.status(200).json({
        message: "Record Fetched",
        error: false,
        tasks: Object.values(groupedData),
      });
    });
  },

  fetchAttendancebyteamforadmin: async function (req, res) {
    try {
      const user_id = req.body.user_id;
      const month = req.body.month || new Date().getMonth() + 1;
      const year = req.body.year || new Date().getFullYear();

      let where = " WHERE a.is_deleted = 0 AND a.user_id = ?";
      let values = [user_id];

      if (month && year) {
        where += " AND MONTH(a.date) = ? AND YEAR(a.date) = ?";
        values.push(month, year);
      }

      // 🔹 Attendance List
      const sql1 = `
      SELECT 
        a.id, 
        a.latitude,
        a.longitude,
        a.out_latitude,
        a.out_longitude,
        IFNULL(DATE_FORMAT(a.date, '%e-%M-%Y'), '') AS formatted_date, 
        TIME_FORMAT(a.checkin, '%h:%i %p') AS formatted_checkin, 
        TIME_FORMAT(a.checkout, '%h:%i %p') AS formatted_checkout, 
        IFNULL(TIMESTAMPDIFF(MINUTE, a.breakin, a.breakout), 0) AS total_break_minutes,
        COALESCE(u.first_name, '') AS first_name, 
        COALESCE(u.last_name, '') AS last_name
      FROM attendance AS a 
      LEFT JOIN users AS u ON u.id = a.user_id  
      ${where}
      ORDER BY a.id DESC
    `;

      // 🔹 Attendance Summary Counts
      const sql2 = `
      SELECT 
        SUM(CASE WHEN a.att_type = 1 THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.att_type = 2 THEN 1 ELSE 0 END) AS half_day_count,
        SUM(CASE WHEN a.att_type = 3 THEN 1 ELSE 0 END) AS full_leave_count,
        SUM(CASE WHEN a.att_type = 4 THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.att_type IN (2,3) THEN 1 ELSE 0 END) AS used_leave_count,
        COUNT(*) AS total_days
      FROM attendance AS a
      WHERE a.is_deleted = 0 
        AND a.user_id = ? 
        AND MONTH(a.date) = ?  
        AND YEAR(a.date) = ?;
    `;

      // 🔹 First Query
      db.query(sql1, values, function (err, attendanceResult) {
        if (err) {
          console.error("SQL1 Error:", err);
          return res.status(500).send({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        // 🔹 Format Data
        const formattedAttendance = attendanceResult.map((row) => {
          Object.keys(row).forEach((key) => {
            row[key] = row[key] !== null ? String(row[key]) : "";
          });
          return row;
        });

        // 🔹 Second Query (Counts)
        db.query(sql2, [user_id, month, year], function (err, countResult) {
          if (err) {
            console.error("SQL2 Error:", err);
            return res.status(500).send({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }

          const counts = countResult[0] || {};

          const summary = {
            total_days: parseInt(counts.total_days) || 0,
            present_count: parseInt(counts.present_count) || 0,
            half_day_count: parseInt(counts.half_day_count) || 0,
            full_leave_count: parseInt(counts.full_leave_count) || 0,
            absent_count: parseInt(counts.absent_count) || 0,
            used_leave_count: parseInt(counts.used_leave_count) || 0,
          };

          res.status(200).send({
            error: false,
            message:
              formattedAttendance.length > 0
                ? "Record fetched successfully"
                : "No records found",
            data: formattedAttendance,

            // ✅ Counts
            summary: summary,
          });
        });
      });
    } catch (error) {
      console.error("Unexpected Error:", error);
      res.status(500).send({
        error: true,
        message: "Internal Server Error",
        data: {},
      });
    }
  },

  getopmeetingbyteamforadmin: (req, res) => {
    const user_id = req?.body?.user_id;
    const page = parseInt(req.body.page) || 1;
    const limit = parseInt(req.body.limit) || 10;
    const totalLimit = page * limit;

    var sql = `SELECT 
       om.id, 
        DATE_FORMAT(omd.date, '%e %M %Y') AS formatted_date,
        DATE_FORMAT(t.due_date, '%e %M %Y') AS due_date,
        IFNULL(vu.first_name, '') AS verified_first_name,
        IFNULL(vu.last_name, '') AS verified_last_name,
        IFNULL(md.name, '') AS Departmentname,
        IFNULL(omd.verified, '') AS Verified,
        IFNULL(u.first_name, '') AS first_name,
        IFNULL(u.last_name, '') AS last_name,
        GROUP_CONCAT(DISTINCT at.profile_picture ORDER BY at.profile_picture SEPARATOR ', ') AS assign_to_profiles,
        CAST(IFNULL(COUNT(CASE WHEN t.status = 1 AND (t.assign_to = ? OR t.contributon = ?) THEN 1 END), 0) AS CHAR) AS completed_tasks,
        CAST(IFNULL(COUNT(CASE WHEN t.status != 1 AND (t.assign_to = ? OR t.contributon = ?) THEN 1 END), 0) AS CHAR) AS uncompleted_tasks,
        CAST(
            IFNULL(
                ROUND(
                    (COUNT(CASE WHEN t.status = 1 AND (t.assign_to = ? OR t.contributon = ?) THEN 1 END) / 
                    NULLIF(COUNT(CASE WHEN (t.assign_to = ? OR t.contributon = ?) THEN 1 END), 0) * 100), 
                    2
                ), 
                0
            ) AS CHAR
        ) AS completed_percentage,
        CASE 
            WHEN 
                ROUND(
                    (COUNT(CASE WHEN t.status = 1 AND (t.assign_to = ? OR t.contributon = ?) THEN 1 END) / 
                    NULLIF(COUNT(CASE WHEN (t.assign_to = ? OR t.contributon = ?) THEN 1 END), 0) * 100), 
                    2
                ) > 50 
            THEN '1' 
            ELSE '0' 
        END AS is_ok,
        CAST(
            IF(
                (ANY_VALUE(omd.clarity_1_key_highlight) IS NULL OR ANY_VALUE(omd.clarity_1_key_highlight) = '') AND
                (ANY_VALUE(omd.clarity_2_key_highlight) IS NULL OR ANY_VALUE(omd.clarity_2_key_highlight) = '') AND
                (ANY_VALUE(omd.clarity_1_key_action) IS NULL OR ANY_VALUE(omd.clarity_1_key_action) = '') AND
                (ANY_VALUE(omd.clarity_2_key_action) IS NULL OR ANY_VALUE(omd.clarity_2_key_action) = ''),
                '1',
                '0'
            ) AS CHAR) AS fill
    FROM 
        op_meeting_detail AS omd
        LEFT JOIN op_meeting AS om ON om.id = omd.meeting_id
        LEFT JOIN users AS u ON u.id = om.facilator
        LEFT JOIN users AS vu ON vu.id = omd.verified_by
        LEFT JOIN mst_department AS md ON md.id = om.mst_department_id
        LEFT JOIN todos AS t ON t.mst_department_id = om.mst_department_id
        LEFT JOIN users AS at ON FIND_IN_SET(at.id, om.participants) > 0
    WHERE 
        omd.is_deleted = 0 
        AND omd.user_id = ?
        AND DATE(omd.date) = DATE(t.due_date)
    GROUP BY 
        om.id, 
        omd.date, 
        t.due_date,
        vu.first_name, 
        vu.last_name, 
        md.name, 
        omd.verified,
        u.first_name, 
        u.last_name
    ORDER BY 
        om.id desc
    LIMIT ?;`;

    var countSql = `SELECT COUNT(*) AS total FROM op_meeting WHERE is_deleted = 0;`;

    db.query(countSql, (err, countResult) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      }

      const totalRecords = countResult[0].total;
      const totalPages = Math.ceil(totalRecords / limit);

      db.query(
        sql,
        [
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          user_id,
          totalLimit,
        ],
        (err, result) => {
          if (err) {
            return res
              .status(500)
              .json({ message: err.sqlMessage, error: true, data: {} });
          }

          if (!result || result.length === 0) {
            return res.status(200).json({
              message: "No records found",
              error: false,
              data: [],
              pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalRecords: totalRecords,
                limit: limit,
              },
            });
          }

          const formattedResult = result.map((row) => ({
            id: row.id,
            formatted_date: row.formatted_date,
            due_date: row.due_date,
            verified_first_name: row.verified_first_name,
            verified_last_name: row.verified_last_name,
            Verified: row.Verified,
            Departmentname: row.Departmentname,
            first_name: row.first_name,
            last_name: row.last_name,
            fill: row.fill,
            assign_to_profiles: row.assign_to_profiles
              ? row.assign_to_profiles.split(", ")
              : [],
            is_ok: row.is_ok ? row.is_ok.toString() : "0",
            completed_percentage: row.completed_percentage
              ? row.completed_percentage.toString()
              : "0",
            completed_tasks: row.completed_tasks
              ? row.completed_tasks.toString()
              : "0",
            uncompleted_tasks: row.uncompleted_tasks
              ? row.uncompleted_tasks.toString()
              : "0",
          }));

          res.status(200).json({
            message: "Record Fetched",
            error: false,
            data: formattedResult,
            pagination: {
              currentPage: page,
              totalPages: totalPages,
              totalRecords: totalRecords,
              limit: limit,
            },
          });
        },
      );
    });
  },

  // apporval

  fetchApprovalforteambyadmin: (req, res) => {
    const user_id = req?.body?.user_id;

    var sql = `
  SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje,
    IFNULL(mpt.title, '') AS category,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
      IFNULL(pv.pv_file, '') AS pv_file,
    IFNULL(fn.fire_noc_receipt, '') AS fire_noc_receipt,
    IFNULL(od.approval_plan, '') AS approval_plan,
     IFNULL(mpd.title, '') AS title,
    CASE 
    WHEN MIN(nmfd.assign_on) IS NULL THEN ''
        WHEN CURDATE() < MIN(nmfd.assign_on) THEN '-' 
        ELSE DATEDIFF(MAX(nmfd.completed_by), CURDATE()) 
    END AS remaining_days, 
    TRIM(BOTH ',' FROM 
        CONCAT(
            CASE WHEN MAX(od.approval_plan) IS NOT NULL THEN 'B.Permission, ' ELSE '' END,
            CASE WHEN MAX(fn.fire_noc_receipt) IS NOT NULL THEN 'Fire Noc, ' ELSE '' END,
            CASE WHEN MAX(pv.pv_file) IS NOT NULL THEN 'P.V., ' ELSE '' END
        )
    ) AS status 
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
LEFT JOIN 
    outward_details AS od ON od.approval_id = nmf.id
LEFT JOIN 
    fire_noc AS fn ON fn.approval_id = nmf.id
LEFT JOIN 
    pv ON pv.approval_id = nmf.id
LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
     LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name 
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
WHERE 
    nmf.is_deleted = 0 
    AND  (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?) and nmfpd.application_name = "approval_process"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.authority,mpd.title, 
    mpt.title, a.first_name, a.profile_picture,od.approval_plan,fn.fire_noc_receipt,pv.pv_file,
    nmf.tentative_design, cu.first_name, v.name, tp.tpscheme;
`;
    db.query(sql, [user_id, user_id], function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err); // Log the error for debugging
        return res
          .status(500) // Server error
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (projectResult.length > 0) {
        // Group the results by case_id
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          // Combine member names
          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
          });

          // Concatenate the status
          acc[row.case_id].status += row.status;

          // Ensure remaining days and status are set correctly
          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        // Convert the grouped result back to an array
        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(404)
          .json({ error: true, message: "Not found", data: [] });
      }
    });
  },

  fetchArchitectureforteambyadmin: (req, res) => {
    const user_id = req?.body?.user_id;
    var sql = `
       SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(mpt.title, '') AS category,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
      IFNULL(nmf.google_location, '') AS google_location,
       IFNULL(nmf.address, '') AS address,
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
             COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members 
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
       LEFT JOIN 
    users AS team ON JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS JSON), '$')
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
             LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
WHERE 
    nmf.is_deleted = 0 
   AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?)
         and nmfpd.application_name = "architecture_design"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name
         ORDER BY 
    nmf.id DESC;
`;

    db.query(sql, [user_id, user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));
          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchInteriorforteambyadmin: (req, res) => {
    const user_id = req?.body?.user_id;
    var sql = `
       SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(mpt.title, '') AS category,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
          IFNULL(nmf.google_location, '') AS google_location,
       IFNULL(nmf.address, '') AS address,
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
                 COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members 

FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
       LEFT JOIN 
    users AS team ON JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS JSON), '$')
             LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
WHERE 
    nmf.is_deleted = 0 
   AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?)
         and nmfpd.application_name = "interior_design"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name
        ORDER BY 
    nmf.id DESC;
`;

    db.query(sql, [user_id, user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));

          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  fetchAllClient: (req, res) => {
    try {
      var sql = `
         SELECT 
        u.id,
        IFNULL(u.first_name, '') AS first_name,
        IFNULL(u.last_name, '') AS last_name,
        IFNULL(u.profile_picture, '') AS profile_picture,
        IFNULL(u.company_name, '') AS company_name,
        IFNULL(u.phone, '') AS phone,
        IFNULL(u.email, '') AS email,
        IFNULL(u.gst, '') AS gst,
        IFNULL(s.name, '') AS state, 
        IFNULL(u.city, '') AS city,
        IFNULL(c.name, '') AS country,
        IFNULL(u.address, '') AS address
        FROM users AS u
        LEFT JOIN users_groups AS ug ON ug.mst_user_id = u.id
        LEFT JOIN user_department_post AS udp ON udp.user_id = u.id
        left join countries as c on c.country_id = u.country
        left join states as s on s.state_id = u.state
        WHERE u.isdeleted = 0 AND ug.mst_group_id = 4
        GROUP BY u.id`;

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length) {
          // Format department names as an array
          result = result.map((user) => ({
            ...user,
          }));

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
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  fetchApprovalforclientbyadmin: (req, res) => {
    const user_id = req?.body?.client_id;
    var sql = `
SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(mpt.title, '') AS category,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
    IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje,
    COUNT(DISTINCT si.id) AS count_site -- Ensure accurate count of site inspections
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
LEFT JOIN 
    site_inspection AS si ON si.mst_file_project_id = nmf.id AND si.is_deleted = 0
WHERE 
    nmf.is_deleted = 0 
    AND nmf.client_id = ?
    AND nmfpd.application_name = "approval_process"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title,
    nmf.tentative_design, cu.first_name, 
    v.name, tp.tpscheme

`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ success: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: true, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            success: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchArchitectureforclientbyadmin: (req, res) => {
    const user_id = req?.body?.client_id;
    var sql = `
         SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(mpt.title, '') AS category,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
       IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
             LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
WHERE 
    nmf.is_deleted = 0 
   AND
nmf.client_id =?
         and nmfpd.application_name = "architecture_design"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name

`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchInteriorforclientbyadmin: (req, res) => {
    const user_id = req?.body?.client_id;
    var sql = `
         SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(mpt.title, '') AS category,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
       IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
             LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
    LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
WHERE 
    nmf.is_deleted = 0 
   AND
nmf.client_id =?
         and nmfpd.application_name = "interior_design"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name

`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchsiteinspectionclientforadmin: (req, res) => {
    const id = req?.body?.Id;
    var sql = `
select si.id,
DATE_FORMAT(si.created_at, '%d-%M-%Y') AS date,
 IFNULL(si.site_incharge, '') AS site_incharge,
  IFNULL(si.key_observation, '') AS key_observation,
  IFNULL(si.remarks, '') AS remarks,
   IFNULL(si.latitude, '') AS site_latitude,
    IFNULL(si.longitude, '') AS site_longitude,
  IFNULL(si.review_by_sign, '') AS review_by_sign,
  IFNULL(si.client_sign, '') AS client_sign,
  IFNULL(u.first_name, '') AS client_name,
  IFNULL(u.company_name, '') AS company_name,
    IFNULL(u.address, '') AS address,
    IFNULL(nmf.lat, '') AS lattitude,
    IFNULL(nmf.long, '') AS longitude,
    IFNULL(nmf.google_location, '') AS google_location,
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
      IFNULL(mpt.title, '') AS category_type,
       IFNULL(mc.name,'') As  project_type,
      IFNULL(mic.title,'') As  visit_work,
    IFNULL(mt.type_name,'') As  visit_category
from site_inspection as si
left join new_mst_file as nmf
on nmf.id = si.mst_file_project_id
left join users as u 
on u.id =  nmf.client_id
 LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
left join mst_category as mc on mc.id = nmf.project_type
left join mst_inspection_checklist as mic
on mic.id = si.mst_inspection_checklist_id
left join mst_type as mt
on mt.id = si.mst_type_id
where si.is_deleted = 0 and  nmf.id = ?
`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fecthAttendanceList: (req, res) => {
    const user_id = req.user ? req.user.id : null;

    try {
      var sql = `
    SELECT 
    id,
    IFNULL(DATE_FORMAT(date, '%e-%M-%Y'), '') AS formatted_date,
    TIME_FORMAT(checkin, '%h:%i %p') AS formatted_checkin, 
    TIME_FORMAT(checkout, '%h:%i %p') AS formatted_checkout, 
    IFNULL(TIMESTAMPDIFF(MINUTE, breakin, breakout), 0) AS total_break_minutes
FROM attendance 
WHERE user_id = ? and is_deleted = 0
AND MONTH(date) = MONTH(CURDATE()) 
AND YEAR(date) = YEAR(CURDATE())
`;

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

  fetchAllattendance: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    const date = req.body.date;

    if (!user_id || !date) {
      return res
        .status(400)
        .json({ message: "Invalid input", error: true, data: {} });
    }

    try {
      const sql1 = `
            SELECT 
    id,
    IFNULL(DATE_FORMAT(date, '%Y-%m-%d'), '') AS formatted_date,
    CASE 
        WHEN att_type IS NULL OR att_type = '' THEN '3' 
        ELSE att_type 
    END AS att_type
FROM attendance
WHERE user_id = ? 
AND is_deleted = 0
AND DATE_FORMAT(date, '%Y-%m') = ?;
        `;

      const sql2 = `SELECT 
  att.present_days,
  att.half_days,
  att.absent_days,
  IFNULL(pms.pms_hours, 0) AS pms_hours
FROM (
  SELECT 
    COUNT(CASE WHEN att_type = 1 THEN 1 END) AS present_days,
    COUNT(CASE WHEN att_type = 2 THEN 1 END) AS half_days,
    COUNT(CASE WHEN att_type = 3 THEN 1 END) AS absent_days
  FROM attendance 
  WHERE user_id =?
    AND is_deleted = 0
    AND DATE_FORMAT(date, '%Y-%m') = ?
) AS att
LEFT JOIN (
  SELECT Round(SUM(hours)) AS pms_hours
  FROM pms
  WHERE created_by = ?
    AND DATE_FORMAT(created_at, '%Y-%m') = ?  
) AS pms ON 1=1;`;

      db.query(sql1, [user_id, date], (err, attendance) => {
        if (err) {
          return res
            .status(500)
            .json({ message: err.sqlMessage, error: true, data: {} });
        }

        db.query(sql2, [user_id, date, user_id, date], (err, totals) => {
          if (err) {
            return res
              .status(500)
              .json({ message: err.sqlMessage, error: true, data: {} });
          }

          res.status(200).json({
            message: attendance.length ? "Record fetched" : "Not found",
            error: false,

            data: attendance,
            totals: totals[0],
          });
        });
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  addsiteinspection: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const site = {
      department: this_data.department,
      mst_file_project_id: this_data.mst_file_project_id,
      others_text: this_data.others_text,
      mst_type_id: this_data.mst_type_id,
      latitude: this_data.latitude,
      longitude: this_data.longitude,
      mst_inspection_checklist_id: this_data.mst_inspection_checklist_id,
      key_observation: this_data.key_observation,
      remarks: this_data.remarks,
      site_incharge: this_data.site_incharge,
      authorized_person: this_data.authorized_person,
      review_by: user_id,
      client_sign: this_data.client_sign,
      review_by_sign: this_data.review_by_sign,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO site_inspection SET ?", site, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Site inspection has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  uploadsiteinspection: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }
    // Process uploaded files
    const files = [];
    let client_sign = "";
    let review_by_sign = "";
    const unnecessary_files = [];

    req.files.forEach((file) => {
      if (file.fieldname === "client_sign") {
        client_sign = getImageWithFoldername(file.path);
        files.push(client_sign);
      } else if (file.fieldname === "review_by_sign") {
        review_by_sign = getImageWithFoldername(file.path);
        files.push(review_by_sign);
      } else {
        unlinkImage(file.path);
      }
    });

    const siteinspection = {
      client_sign: client_sign,
      review_by_sign: review_by_sign,
    };
    console.log("site==>", siteinspection);

    //   // If insertion is successful, you can send a success response here
    const data = {
      error: false,
      message: "upload image successfully.",
      data: {
        client_sign: client_sign,
        review_by_sign: review_by_sign,
      },
    };
    res.status(201).json(data);
  },

  getsiteEmp: async function (req, res) {
    const team_id = req.user ? req.user.id : null;
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const category_id = req?.body?.category_id || null;
    const file_id = req?.body?.file_id || null;

    let where =
      " WHERE si.is_deleted = 0 AND MONTH(si.created_at) = MONTH(CURDATE()) AND YEAR(si.created_at) = YEAR(CURDATE())";

    let values = []; // For parameterized queries

    if (team_id) {
      where += " AND si.review_by = ?";
      values.push(team_id);
    }
    if (fromdate && todate) {
      where += " AND DATE(si.created_at) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    }
    if (category_id) {
      where += " AND si.mst_type_id = ?";
      values.push(category_id);
    }
    if (file_id) {
      where += " AND si.mst_file_project_id = ?";
      values.push(file_id);
    }

    let sql = `
    SELECT 
        si.id,
        IFNULL(DATE_FORMAT(si.created_at, '%e-%M-%Y'), '') AS formatted_date, 
        IFNULL(nmf.case_id, '') AS case_id, 
           IFNULL(si.latitude, '') AS latitude,
            IFNULL(si.longitude, '') AS longitude,
           IFNULL(u.first_name, '') AS client_name,
        IFNULL(mt.type_name, '') AS category_name
    FROM site_inspection AS si
    LEFT JOIN new_mst_file AS nmf ON nmf.id = si.mst_file_project_id
    LEFT JOIN mst_type AS mt ON mt.id = si.mst_type_id
    left join users as u on u.id = nmf.client_id
    ${where} 
    ORDER BY si.id DESC;`;

    db.query(sql, values, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, siteinspection: {} });
      }
      return res.status(200).json({
        error: false,
        message:
          result.length > 0 ? "Record fetched successfully" : "Not found",
        siteinspection: result.length > 0 ? result : [],
      });
    });
  },

  getProjectData: (req, res) => {
    try {
      const id = req.body?.id;

      // Mapping ID to application_name
      const applicationNameMap = {
        1: "approval_process",
        2: "architecture_design",
        3: "interior_design",
      };

      const applicationName = applicationNameMap[id];

      let sql = `
        SELECT nmf.id, nmf.case_id, u.first_name, nmf.company_name, nmf.address, nmf.lat, nmf.long, nmf.google_location,
               mpt.title AS category_type, mc.name AS project_type
        FROM new_mst_file AS nmf
        LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
        LEFT JOIN mst_category AS mc ON mc.id = nmf.project_type
        LEFT JOIN new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        LEFT JOIN users AS u ON u.id = nmf.client_id
        WHERE nmf.is_deleted = 0`;

      const params = [];

      // Add conditionally if applicationName exists
      if (applicationName) {
        sql += " AND nmfpd.application_name = ?";
        params.push(applicationName);
      }

      db.query(sql, params, (err, result) => {
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
  // getProjectData: (req, res) => {
  //   try {
  //     const id = req.body?.id;

  //     // Mapping ID to application_name
  //     const applicationNameMap = {
  //       1: "approval_process",
  //       2: "architecture_design",
  //       3: "interior_design",
  //     };

  //     const applicationName = applicationNameMap[id];

  //     if (applicationName) {
  //       const sql = `
  //     SELECT nmf.id, nmf.case_id,u.first_name, nmf.company_name,nmf.address,nmf.lat,nmf.long,nmf.google_location,mpt.title as category_type,mc.name as project_type
  //         FROM new_mst_file AS nmf
  //         LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
  //          left join mst_category as mc on mc.id = nmf.project_type
  //          left join new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
  //           left join users as u on u.id = nmf.client_id
  //         WHERE  nmf.is_deleted = 0 and nmfpd.application_name =?`;

  //       db.query(sql, [applicationName], (err, result) => {
  //         if (err) {
  //           console.error("Database query error:", err);
  //           res.status(500).json({
  //             message: err.sqlMessage || "Database error",
  //             error: true,
  //             data: {},
  //           });
  //         } else if (result.length) {
  //           res.status(200).json({
  //             message: "Record fetched",
  //             error: false,
  //             data: result,
  //           });
  //         } else {
  //           res.status(404).json({
  //             message: "Not found",
  //             error: false,
  //             data: [],
  //           });
  //         }
  //       });
  //     } else {
  //       res.status(400).json({
  //         message: "Invalid request",
  //         error: true,
  //         data: {},
  //       });
  //     }
  //   } catch (err) {
  //     console.error("Unexpected error:", err);
  //     res.status(500).json({
  //       message: "Server error",
  //       error: true,
  //       data: {},
  //     });
  //   }
  // },

  getOfficeExpenseForEmployee: (req, res) => {
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const is_approved = req?.body?.status || null;
    const user_id = req.user ? req.user.id : null;

    let where =
      "WHERE de.isdeleted = 0 AND de.expense_type = 3 AND de.team_id = ?";
    let values = [user_id]; // Include user_id as the first parameter

    // Filter by status
    if (is_approved) {
      where += " AND de.is_approved = ?";
      values.push(is_approved);
    }

    // Filter by date range
    if (fromdate && todate) {
      where += " AND DATE(de.date) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    } else {
      // Default to the current month only if no date filters are provided
      where +=
        " AND MONTH(de.date) = MONTH(CURDATE()) AND YEAR(de.date) = YEAR(CURDATE())";
    }

    const sql = `
      SELECT 
        de.id, 
        IFNULL(de.description, '') AS description, 
        IFNULL(de.amount, '') AS amount, 
         IFNULL(de.is_approved, '') AS is_approved, 
        IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
        IFNULL(de.receipt_image, '') AS receipt_image
      FROM deposit_expense AS de
      ${where}
      ORDER BY de.id DESC`;

    db.query(sql, values, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: result.length > 0 ? result : [],
        });
      }
    });
  },

  getProjectExpenseForTeam: (req, res) => {
    const fromdate = req?.body?.from_date || null;
    const todate = req?.body?.to_date || null;
    const is_approved = req?.body?.status || null;
    const mst_file_id = req?.body?.mst_file_id || null;
    const user_id = req.user ? req.user.id : null;

    let where =
      " WHERE de.isdeleted = 0 AND de.expense_type = 2 AND de.team_id = ?";
    let values = [user_id];

    if (is_approved) {
      where += " AND de.is_approved = ?";
      values.push(is_approved);
    }
    if (mst_file_id) {
      where += " AND de.mst_file_id = ?";
      values.push(mst_file_id);
    }
    if (fromdate && todate) {
      where += " AND DATE(de.date) BETWEEN ? AND ?";
      values.push(fromdate, todate);
    } else {
      where +=
        " AND MONTH(de.date) = MONTH(CURDATE()) AND YEAR(de.date) = YEAR(CURDATE())";
    }

    var sql = `SELECT 
        de.id, 
        IFNULL(de.description, '') AS description, 
        IFNULL(de.amount, '') AS amount, 
        IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
        IFNULL(de.receipt_image, '') AS receipt_image, 
        IFNULL(nmf.case_id, '') AS case_id,
          IFNULL(de.is_approved, '') AS status,
        IFNULL(u.first_name, '') AS client_name
    FROM deposit_expense AS de
    LEFT JOIN new_mst_file AS nmf ON nmf.id = de.mst_file_id
    LEFT JOIN users AS u ON u.id = nmf.client_id
    ${where}
    ORDER BY de.id DESC;`;

    // ✅ Pass `values` to `db.query`
    db.query(sql, values, (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      } else {
        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: result.length > 0 ? result : [],
        });
      }
    });
  },

  getDepositExpenseForteam: (req, res) => {
    const user_id = req.user ? req.user.id : null;

    var sql = `SELECT 
                  de.id, 
                  IFNULL(de.description, '') AS description, 
                  IFNULL(de.amount, '') AS amount, 
                  IFNULL(DATE_FORMAT(de.date, '%e-%M-%Y'), '') AS formatted_date, 
                  IFNULL(u.first_name, '') AS first_name, 
                  IFNULL(u.last_name, '') AS last_name, 
                  IFNULL(u.profile_picture, '') AS profile_picture
              FROM deposit_expense AS de
              LEFT JOIN users AS u ON u.id = de.team_id
              WHERE de.isdeleted = 0 
                AND de.expense_type = 1 
                AND de.team_id = ? 
                AND MONTH(de.date) = MONTH(CURDATE()) 
                AND YEAR(de.date) = YEAR(CURDATE())`;

    var sql2 = `SELECT 
                    SUM(IFNULL(de.amount, 0)) AS total_amount
                FROM deposit_expense AS de
                WHERE de.isdeleted = 0 
                    AND de.expense_type = 1 
                    AND de.team_id = ? 
                    AND MONTH(de.date) = MONTH(CURDATE()) 
                    AND YEAR(de.date) = YEAR(CURDATE())`;

    // Execute both queries in parallel
    db.query(sql, [user_id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      }

      db.query(sql2, [user_id], (err2, totalResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ message: err2.sqlMessage, error: true, data: {} });
        }

        res.status(200).json({
          message: "Record Fetched",
          error: false,
          data: {
            records: result.length > 0 ? result : [],
            total_amount: totalResult[0].total_amount || 0,
          },
        });
      });
    });
  },

  getdocumentbyteam: (req, res) => {
    const user_id = req.body.userid;
    const sql = `SELECT 
                  IFNULL(adhar_card, '') AS adhar_card, 
                  IFNULL(graduation_certificate, '') AS graduation_certificate, 
                  IFNULL(offer_letter, '') AS offer_letter, 
                  IFNULL(bond_agreement, '') AS bond_agreement, 
                  IFNULL(signature, '') AS signature
              FROM users WHERE id = ?`;

    db.query(sql, [user_id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: err.sqlMessage, error: true, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(404)
          .json({ message: "No Record Found", error: true, data: [] });
      }

      const documentData = result[0]; // Extracting the first row (assuming one user record)
      const formattedResponse = [
        { title: "Adhar Card", image: "public/" + documentData.adhar_card },
        {
          title: "Graduation Certificate",
          image: "public/" + documentData.graduation_certificate,
        },
        { title: "Offer Letter", image: "public/" + documentData.offer_letter },
        {
          title: "Bond Agreement",
          image: "public/" + documentData.bond_agreement,
        },
        { title: "Signature", image: "public/" + documentData.signature },
      ].filter((item) => item.image !== ""); // Remove empty file paths if necessary

      return res.status(200).json({
        message: "Record Fetched",
        error: false,
        data: formattedResponse,
      });
    });
  },

  fetchApprovalforteam: (req, res) => {
    const user_id = req.user ? req.user.id : null;

    var sql = `
SELECT 
  nmf.id, 
  IFNULL(nmf.case_id, '') AS case_id,
  IFNULL(nmf.project_name, '') AS project_name,
  IFNULL(nmf.authority, '') AS authority,
  IFNULL(v.name, '') AS village,
  IFNULL(tp.tpscheme, '') AS tpscheme,
  IFNULL(nmf.op_no, '') AS op_no,
  IFNULL(nmf.fp_no, '') AS fp_no,
  IFNULL(nmf.b_no, '') AS b_no,
  IFNULL(nmf.rs_no, '') AS rs_no,
  IFNULL(nmf.ward_no, '') AS ward_no,
  IFNULL(nmf.moje, '') AS moje,
  IFNULL(mpt.title, '') AS category,
  IFNULL(a.first_name, '') AS facilator_name,
  a.profile_picture AS hod_profile, 
  IFNULL(nmf.tentative_design, '') AS tentative_design,
  cu.first_name AS client_name,
    IFNULL(pv.pv_file, '') AS pv_file,
  IFNULL(fn.fire_noc_receipt, '') AS fire_noc_receipt,
  IFNULL(od.approval_plan, '') AS approval_plan,
   IFNULL(mpd.title, '') AS title,
  GROUP_CONCAT(DISTINCT empu.profile_picture ORDER BY empu.profile_picture SEPARATOR ', ') AS assign_to_profiles,

  CASE 
    WHEN MIN(nmfd.assign_on) IS NULL THEN ''
    WHEN CURDATE() < MIN(nmfd.assign_on) THEN '-' 
    ELSE DATEDIFF(MAX(nmfd.completed_by), CURDATE()) 
END AS remaining_days,
  TRIM(BOTH ',' FROM 
      CONCAT(
          CASE WHEN MAX(od.approval_plan) IS NOT NULL THEN 'B.Permission, ' ELSE '' END,
          CASE WHEN MAX(fn.fire_noc_receipt) IS NOT NULL THEN 'Fire Noc, ' ELSE '' END,
          CASE WHEN MAX(pv.pv_file) IS NOT NULL THEN 'P.V., ' ELSE '' END
      )
  ) AS status 
FROM 
  new_mst_file AS nmf
LEFT JOIN 
  new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
  mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
  users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
  users AS cu ON cu.id = nmf.client_id
LEFT JOIN 
  outward_details AS od ON od.approval_id = nmf.id
LEFT JOIN 
  fire_noc AS fn ON fn.approval_id = nmf.id
LEFT JOIN 
  pv ON pv.approval_id = nmf.id
LEFT JOIN 
  village AS v ON v.id = nmf.village 
LEFT JOIN 
  tpscheme AS tp ON tp.id = nmf.tpscheme 
   LEFT JOIN 
      mst_project_details AS mpd ON mpd.id = nmfd.project_name 
       LEFT JOIN 
  new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
   LEFT JOIN users AS empu 
    ON FIND_IN_SET(empu.id, 
        REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', '')
    ) > 0
WHERE 
  nmfpd.is_deleted = 0 
  AND  (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      OR nmfd.assign_to_hod = ?) and nmfpd.application_name = "approval_process"
GROUP BY 
  nmf.id, nmf.case_id, nmf.project_name, nmf.authority,mpd.title, 
  mpt.title, a.first_name, a.profile_picture,od.approval_plan,fn.fire_noc_receipt,pv.pv_file,
  nmf.tentative_design, cu.first_name, v.name, tp.tpscheme;
`;
    db.query(sql, [user_id, user_id], function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err); // Log the error for debugging
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (projectResult.length > 0) {
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          // Combine member names
          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
            Emp_profiles: row.assign_to_profiles
              ? row.assign_to_profiles.split(", ")
              : [],
          });

          acc[row.case_id].status += row.status;

          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          error: false,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(200)
          .json({ error: false, message: "Not found", data: [] });
      }
    });
  },

  fetchInteriorforteam: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    var sql = `
      SELECT 
      nmf.id, 
      IFNULL(nmf.case_id, '') AS case_id,
      IFNULL(nmf.project_name, '') AS project_name,
      IFNULL(nmf.authority, '') AS authority,
      IFNULL(v.name, '') AS village,
      IFNULL(nmf.tpscheme, '') AS tpscheme,
      IFNULL(nmf.op_no, '') AS op_no,
      IFNULL(nmf.fp_no, '') AS fp_no,
      IFNULL(nmf.rs_no, '') AS rs_no,
      IFNULL(nmf.b_no, '') AS b_no,
        IFNULL(nmf.google_location, '') AS google_location,
       IFNULL(nmf.address, '') AS address,
      IFNULL(mpt.title, '') AS category,
      IFNULL(a.first_name, '') AS facilator_name,
      a.profile_picture AS hod_profile, 
      IFNULL(nmf.tentative_design, '') AS tentative_design,
      cu.first_name AS client_name,
          COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members

      FROM 
      new_mst_file AS nmf
      LEFT JOIN 
      new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
      LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
      LEFT JOIN 
      users AS a ON nmfd.assign_to_hod = a.id
      LEFT JOIN 
      users AS cu ON cu.id = nmf.client_id
          LEFT JOIN 
    users AS team ON JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS JSON), '$')
      LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        left join village as v on v.id = nmf.village
      WHERE 
      nmfpd.is_deleted = 0  and nmfpd.is_deleted = 0
      AND
      (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      OR nmfd.assign_to_hod = ?)
      and nmfpd.application_name = "interior_design"
      GROUP BY 
      nmf.id, nmf.case_id, nmf.project_name,
      mpt.title, a.first_name, a.profile_picture, 
      nmf.tentative_design, cu.first_name
      `;

    db.query(sql, [user_id, user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));
          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchArchitectureforteam: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    var sql = `
        SELECT 
        nmf.id, 
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmf.project_name, '') AS project_name,
        IFNULL(nmf.authority, '') AS authority,
        IFNULL(v.name, '') AS village,
        IFNULL(nmf.tpscheme, '') AS tpscheme,
         IFNULL(nmf.google_location, '') AS google_location,
        IFNULL(nmf.op_no, '') AS op_no,
        IFNULL(nmf.fp_no, '') AS fp_no,
        IFNULL(nmf.address, '') AS address,
        IFNULL(nmf.rs_no, '') AS rs_no,
        IFNULL(nmf.b_no, '') AS b_no,
        IFNULL(mpt.title, '') AS category,
        IFNULL(a.first_name, '') AS facilator_name,
        a.profile_picture AS hod_profile, 
        IFNULL(nmf.tentative_design, '') AS tentative_design,
        cu.first_name AS client_name,
            COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members
        FROM 
        new_mst_file AS nmf
        LEFT JOIN 
        new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
        LEFT JOIN 
        mst_project_type AS mpt ON mpt.id = nmf.category
        LEFT JOIN 
        users AS a ON nmfd.assign_to_hod = a.id
        LEFT JOIN 
        users AS cu ON cu.id = nmf.client_id
        LEFT JOIN 
        new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        left join village as v on v.id = nmf.village
        LEFT JOIN 
    users AS team ON JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS JSON), '$')
        WHERE 
        nmfpd.is_deleted = 0 
        AND
        (FIND_IN_SET(?, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        OR nmfd.assign_to_hod = ?)
        and nmfpd.application_name = "architecture_design"
        GROUP BY 
        nmf.id, nmf.case_id, nmf.project_name,
        mpt.title, a.first_name, a.profile_picture, 
        nmf.tentative_design, cu.first_name
        ORDER BY 
    nmf.id DESC;
`;

    db.query(sql, [user_id, user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));
          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchAlltentative: (req, res) => {
    var sql = `
        SELECT 
    nmf.id, 
     IFNULL(nmf.case_id,'') AS case_id, 
     IFNULL(nmf.project_name,'') AS project_name,
     IFNULL(nmf.fp_no,'') AS fp_no,
     IFNULL(nmf.op_no,'') AS op_no,
     IFNULL(nmf.b_no,'') AS b_no,
     IFNULL(nmf.rs_no,'') AS rs_no,
     IFNULL(nmf.authority,'') AS authority,
     IFNULL(nmf.tentative_design,'') AS tentative_design,
     IFNULL(mc.name,'') AS projectType, 
     IFNULL(mpt.title,'')  AS category, 
     IFNULL(v.name,'') AS village, 
     IFNULL(pv.pv_file,'') AS pv_file,
      IFNULL(u.first_name,'') AS client_name,
     IFNULL(fn.fire_noc_receipt,'') AS fire_noc_receipt,
     IFNULL(od.approval_plan,'') AS approval_plan,
     IFNULL(tp.tpscheme,'') AS tpscheme

FROM 
    new_mst_file AS nmf
LEFT JOIN 
    mst_category AS mc ON mc.id = nmf.project_type
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    village AS v ON v.id = nmf.village
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme
LEFT JOIN 
    outward_details AS od ON od.approval_id = nmf.id
LEFT JOIN 
    fire_noc AS fn ON fn.approval_id = nmf.id
      left join users as u on u.id = nmf.client_id
LEFT JOIN 
    pv ON pv.approval_id = nmf.id
      WHERE 
      nmf.is_deleted = 0   and nmf.tentative_design = "yes"
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
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  fetchApprovalforadmin: (req, res) => {
    var sql = `
SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje,
    IFNULL(mpt.title, '') AS category,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
      IFNULL(pv.pv_file, '') AS pv_file,
    IFNULL(fn.fire_noc_receipt, '') AS fire_noc_receipt,
    IFNULL(od.approval_plan, '') AS approval_plan,
     IFNULL(mpd.title, '') AS title,
         GROUP_CONCAT(DISTINCT empu.profile_picture ORDER BY empu.profile_picture SEPARATOR ', ') AS assign_to_profiles,
    CASE 
      WHEN MIN(nmfd.assign_on) IS NULL THEN ''
        WHEN CURDATE() < MIN(nmfd.assign_on) THEN '-' 
        ELSE DATEDIFF(MAX(nmfd.completed_by), CURDATE()) 
    END AS remaining_days, 
    TRIM(BOTH ',' FROM 
        CONCAT(
            CASE WHEN MAX(od.approval_plan) IS NOT NULL THEN 'B.Permission, ' ELSE '' END,
            CASE WHEN MAX(fn.fire_noc_receipt) IS NOT NULL THEN 'Fire Noc, ' ELSE '' END,
            CASE WHEN MAX(pv.pv_file) IS NOT NULL THEN 'P.V., ' ELSE '' END
        )
    ) AS status 
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
LEFT JOIN 
    outward_details AS od ON od.approval_id = nmf.id
LEFT JOIN 
    fire_noc AS fn ON fn.approval_id = nmf.id
LEFT JOIN 
    pv ON pv.approval_id = nmf.id
LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
     LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name 
         LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id  AND nmfd.source_type = 1
     AND nmfpd.is_deleted = 0 
      AND nmfpd.application_name = 'approval_process'
    LEFT JOIN users AS empu 
    ON FIND_IN_SET(empu.id, 
        REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', '')
    ) > 0
WHERE nmfpd.project_id IS NOT NULL
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name, nmf.authority,mpd.title, 
    mpt.title, a.first_name, a.profile_picture,od.approval_plan,fn.fire_noc_receipt,pv.pv_file,
    nmf.tentative_design, cu.first_name, v.name, tp.tpscheme 
    order by id desc;
`;
    db.query(sql, function (err, projectResult) {
      if (err) {
        console.error("SQL Error:", err); // Log the error for debugging
        return res
          .status(500) // Server error
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (projectResult.length > 0) {
        const groupedResult = projectResult.reduce((acc, row) => {
          if (!acc[row.case_id]) {
            acc[row.case_id] = { ...row, member_names: [], status: "" };
          }

          acc[row.case_id].member_names.push({
            member_names: row.member_names,
            title: row.title,
            remaining_days: row.remaining_days,
            Emp_profiles: row.assign_to_profiles
              ? row.assign_to_profiles.split(", ")
              : [],
          });

          acc[row.case_id].status += row.status;

          acc[row.case_id].remaining_days = row.remaining_days;

          return acc;
        }, {});

        const formattedprojectResult = Object.values(groupedResult);

        return res.status(200).json({
          success: true,
          message: "Records fetched",
          data: formattedprojectResult,
        });
      } else {
        return res
          .status(404)
          .json({ error: true, message: "Not found", data: [] });
      }
    });
  },

  fetchArchitectureforadmin: (req, res) => {
    var sql = `
       SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.google_location, '') AS google_location,
    IFNULL(nmf.address, '') AS address,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.moje, '') AS moje,
    IFNULL(mpt.title, '') AS category,
    IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
    COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS team ON JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS JSON), '$')
LEFT JOIN 
    village AS v ON v.id = nmf.village 
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
WHERE 
    nmfpd.is_deleted = 0 
    AND nmfd.source_type = 2
    AND nmfpd.application_name = 'architecture_design'
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name
ORDER BY 
    nmf.id DESC;
`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));

          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  fetchInteriorforadmin: (req, res) => {
    var sql = `
       SELECT 
    nmf.id, 
    IFNULL(nmf.case_id, '') AS case_id,
    IFNULL(nmf.project_name, '') AS project_name,
    IFNULL(nmf.authority, '') AS authority,
    IFNULL(nmf.op_no, '') AS op_no,
    IFNULL(nmf.fp_no, '') AS fp_no,
    IFNULL(nmf.b_no, '') AS b_no,
    IFNULL(nmf.rs_no, '') AS rs_no,
    IFNULL(nmf.ward_no, '') AS ward_no,
    IFNULL(nmf.google_location, '') AS google_location,
    IFNULL(nmf.address, '') AS address,
    IFNULL(nmf.moje, '') AS moje,
    IFNULL(v.name, '') AS village,
    IFNULL(tp.tpscheme, '') AS tpscheme,
    IFNULL(mpt.title, '') AS category,
    IFNULL(a.first_name, '') AS facilator_name,
    a.profile_picture AS hod_profile, 
    IFNULL(nmf.tentative_design, '') AS tentative_design,
    cu.first_name AS client_name,
     COALESCE(
        CONCAT(
            '[', 
            GROUP_CONCAT(DISTINCT team.first_name ORDER BY team.id SEPARATOR ', '), 
            ']'
        ), 
    '[]') AS assign_members

FROM 
    new_mst_file AS nmf
LEFT JOIN 
    new_mst_file_details AS nmfd ON nmfd.project_id = nmf.id
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
    village AS v ON v.id = nmf.village 
    LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme 
  LEFT JOIN 
    users AS team ON nmfd.assign_members IS NOT NULL 
                  AND nmfd.assign_members != ''
                  AND JSON_VALID(nmfd.assign_members)
                  AND JSON_CONTAINS(nmfd.assign_members, CAST(team.id AS CHAR), '$')
LEFT JOIN 
    users AS a ON nmfd.assign_to_hod = a.id
LEFT JOIN 
    users AS cu ON cu.id = nmf.client_id
             LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
WHERE 
    nmfpd.is_deleted = 0 and
       nmfd.source_type = 3 and 
       nmfpd.application_name = "interior_design"
GROUP BY 
    nmf.id, nmf.case_id, nmf.project_name,
    mpt.title, a.first_name, a.profile_picture, 
    nmf.tentative_design, cu.first_name
    ORDER BY 
    nmf.id DESC;
`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          const formattedResult = result.map((row) => ({
            ...row,
            assign_members: row.assign_members
              ? row.assign_members
                  .replace(/^\[|\]$/g, "") // remove [ and ]
                  .split(", ")
                  .filter(Boolean) // remove empty strings
              : [], // return empty array if null
          }));

          res.status(201).json({
            error: false,
            message: "Record fetched",
            data: formattedResult,
          });
        } else {
          res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: {},
          });
        }
      }
    });
  },

  fetchTecticalforAdmin: (req, res) => {
    const { date } = req.body;

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
FROM tc_meeting
WHERE is_deleted = 0 
  AND date < ?
ORDER BY date DESC
LIMIT 1`;

    var sql2 = `SELECT  
    tm.id,
   DATE_FORMAT(tm.date, '%Y-%m-%d') AS date,
    tm.mst_department_id,
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

              const processedResult = meetingResult.map((row) => ({
                ...row,
                participants_pictures: row.participants_pictures
                  ? row.participants_pictures
                      .split(",")
                      .map((pic) => pic.trim())
                  : [],
                performance_color: row.prev_on_time_percentage >= 50 ? 1 : 2,
              }));

              if (meetingResult.length > 0) {
                res.status(200).send({
                  error: false,
                  message: "Record fetched successfully",
                  data: processedResult,

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

  fetchTecticalforFacilator: (req, res) => {
    const user_id = req?.user.id;
    var sql = `
select tm.id,
 DATE_FORMAT(tm.date, '%e %M %Y') AS formatted_date,
   COALESCE(md.name, '') AS Departmentname,
  COALESCE(u.first_name, '') AS first_name,
  COALESCE(u.last_name, '') AS last_name,
   IFNULL(
        ROUND((SUM(tmd.total_completed_tasks) / NULLIF(SUM(tmd.total_task), 0)) * 100, 2), 
        0
    ) AS completion_percentage,
     (SELECT GROUP_CONCAT(DISTINCT at.profile_picture ORDER BY at.profile_picture SEPARATOR ', ')
   FROM users at WHERE FIND_IN_SET(at.id, tm.participants)) AS assign_to_profiles
from tc_meeting as tm
LEFT JOIN users u ON u.id = tm.facilator
LEFT JOIN tc_meeting_detail as tmd on tmd.meeting_id = tm.id
LEFT JOIN mst_department md ON md.id = tm.mst_department_id
WHERE tm.is_deleted = 0 and tm.facilator = ?
GROUP BY tm.id, tm.date, md.name, u.first_name, u.last_name
ORDER BY tm.id DESC;
`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Convert assign_to_profiles from a string to an array
          result = result.map((row) => ({
            ...row,
            assign_to_profiles: row.assign_to_profiles
              ? row.assign_to_profiles.split(", ")
              : [],
          }));

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
  },

  fetchInteriorforAdmin: (req, res) => {
    var sql = `
 SELECT 
      nmf.id, 
       IFNULL(nmf.case_id,'') AS case_id,
      IFNULL(nmf.project_name,'') AS fp_no,
      IFNULL(nmf.fp_no,'') AS fp_no,
      IFNULL(nmf.op_no,'') AS op_no,
      IFNULL(nmf.b_no,'') AS b_no,
      IFNULL(nmf.rs_no,'') AS rs_no,
      IFNULL(nmf.authority,'') AS  authority,
      IFNULL(nmf.tentative_design,'') AS tentative_design,
      IFNULL(mc.name ,'') AS projectType, 
      IFNULL(mpt.title , '') AS category,
      IFNULL(v.name,'')  AS village, 
       IFNULL(u.first_name,'') as client_name,
      IFNULL(tp.tpscheme,'') AS tpscheme
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        WHERE 
        nmf.is_deleted = 0   and nmfpd.application_name = "interior_design"
`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ success: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: true, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            success: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchInteriorforHod: (req, res) => {
    const user_id = req.user.id;
    var sql = `
 SELECT 
      nmf.id, 
       IFNULL(nmf.case_id,'') AS case_id,
      IFNULL(nmf.project_name,'') AS fp_no,
      IFNULL(nmf.fp_no,'') AS fp_no,
      IFNULL(nmf.op_no,'') AS op_no,
      IFNULL(nmf.b_no,'') AS b_no,
      IFNULL(nmf.rs_no,'') AS rs_no,
      IFNULL(nmf.authority,'') AS  authority,
      IFNULL(nmf.tentative_design,'') AS tentative_design,
      IFNULL(mc.name ,'') AS projectType, 
      IFNULL(mpt.title , '') AS category,
      IFNULL(v.name,'')  AS village, 
       IFNULL(u.first_name,'') as client_name,
      IFNULL(tp.tpscheme,'') AS tpscheme
    
    FROM 
      new_mst_file AS nmf
    LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
      village AS v ON v.id = nmf.village
    LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
        left join users as u on u.id = nmf.client_id
         LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
        WHERE 
        nmf.is_deleted = 0   and nmfpd.application_name = "interior_design" and nmfpd.assign_to_hod= ? 
`;

    db.query(sql, [user_id], function (err, result) {
      if (err) {
        res
          .status(201)
          .json({ success: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(201)
            .json({ error: true, message: "Record fetched", data: result });
        } else {
          res.status(201).json({
            success: true,
            message: "Requesting record not found",
            data: [],
          });
        }
      }
    });
  },

  fetchmobilebasicDetails: (req, res) => {
    const id = req.body.id;

    const basicQuery = `
      SELECT  
      bd.id AS bd_id,
      IFNULL(bd.project_detail,'') AS project_detail,
      IFNULL(bd.requirement,'') AS requirement,
      IFNULL(bd.scopework,'') AS scopework,
      IFNULL(nmf.company_name,'') AS company_name,
      IFNULL(nmf.email,'') AS email,
      IFNULL(nmf.phone,'') AS phone,
      IFNULL(nmf.authority,'') AS authority,
      IFNULL(nmf.google_location,'') AS google_location,
      IFNULL(nmf.lat,'') AS lat,
      nmf.long,
      IFNULL(nmf.land_type,'') AS land_type,
      IFNULL(nmf.op_no,'') AS op_no,
      IFNULL(nmf.ward_no,'') AS ward_no,
      IFNULL(nmf.cs_no,'') AS cs_no,
      IFNULL(nmf.fp_no,'') AS fp_no,
      IFNULL(nmf.rs_no,'') AS rs_no,
      IFNULL(nmf.address,'') AS address,
      IFNULL(u.first_name,'') as client_name,
       IFNULL(mptc.id,'') as category_id,
      IFNULL(mptc.title,'') AS title,
       IFNULL(v.name,'') AS village,
       IFNULL(mc.name,'') AS project_type,
       IFNULL(tp.tpscheme,'') AS tpscheme,
      IFNULL(mctq.id,'') AS question_id, 
      IFNULL(mctq.title,'') AS question,
      IFNULL(mqa.answer,'') AS answer
      FROM new_mst_file AS nmf
      LEFT JOIN basic_details AS bd ON bd.interior_id = nmf.id
      LEFT JOIN users AS u ON u.id = nmf.client_id
       left join mst_category as mc on mc.id = nmf.project_type
        left join village as v on v.id = nmf.village
      left join tpscheme as tp on tp.id = nmf.tpscheme
      LEFT JOIN mst_project_type_category AS mptc ON mptc.project_type_id = nmf.archcategory
      LEFT JOIN mst_category_type_question AS mctq ON mctq.category_id = mptc.id and mctq.type = 2
      LEFT JOIN mst_question_answer AS mqa ON mqa.question_id = mctq.id
      WHERE nmf.id = ? 
      `;

    const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_interior_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 1
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;

    db.query(basicQuery, [id], (err, basicResult) => {
      if (err) {
        return res.status(500).json({ error: true, message: err.sqlMessage });
      }

      // Format question-answers grouped by category
      const questionMap = {};
      const basicData = {};

      basicResult.forEach((row) => {
        if (!basicData.id) {
          basicData.id = row.bd_id;
          basicData.requirement = row.requirement;
          basicData.company_name = row.company_name;
          basicData.email = row.email;
          basicData.phone = row.phone;
          basicData.client_name = row.client_name;
          basicData.scopework = row.scopework;
          basicData.project_detail = row.project_detail;
          basicData.project_type = row.project_type;
          basicData.lat = row.lat;
          basicData.long = row.long;
          basicData.land_type = row.land_type;
          basicData.op_no = row.op_no;
          basicData.ward_no = row.ward_no;
          basicData.cs_no = row.cs_no;
          basicData.fp_no = row.fp_no;
          basicData.rs_no = row.rs_no;
          basicData.address = row.address;
          basicData.authority = row.authority;
          basicData.village = row.village;
          basicData.tpscheme = row.tpscheme;
          basicData.category = row.category;
        }

        if (row.category_id) {
          if (!questionMap[row.category_id]) {
            questionMap[row.category_id] = {
              id: row.category_id,
              title: row.title,
              question: [],
            };
          }
          if (row.question_id) {
            questionMap[row.category_id].question.push({
              id: row.question_id,
              name: row.question,
              answer: row.answer,
            });
          }
        }
      });

      const questions = Object.values(questionMap);

      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage });
        }
        return res.status(200).json({
          success: true,
          message: "Record fetched",
          data: [
            {
              ...basicData,
              questionAnswer: questions,
              assignmentDetails: assignResult.map((item) => ({
                ...item,
                assign_picture: item.assign_picture
                  ? item.assign_picture.split(",")
                  : [],
              })),
            },
          ],
        });
      });
    });
  },

  fetchmobileSpacePlanning: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const SpQuery = `
      SELECT 
        msp.id,
        COALESCE(msp.name, 'No Name') AS name,
        IFNULL(sp.id,'') AS spid,
        IFNULL(u.profile_picture,'') as profile_picture,
        IFNULL(ru.profile_picture,'') AS review_profile,
        IFNULL(sp.category_id,'') as category_id,
        IFNULL(sp.internalstatus,'') as internalstatus,
        IFNULL(sp.internalremark,'') as internalremark,
        IFNULL(sp.materialphoto,'') as materialphoto,
         IFNULL(sp.notes,'') as notes,
        IFNULL(sp.clientstatus,'') as clientstatus,
        IFNULL(sp.clientremark,'') as clientremark,
        IFNULL(sp.team_id,'') as team_id,
        IFNULL(sp.is_done,'') as is_done
      FROM mst_space_planning AS msp
      LEFT JOIN space_planning AS sp ON sp.category_id = msp.id AND sp.is_deleted = 0
      LEFT JOIN users AS u ON u.id = sp.created_by 
      LEFT JOIN users AS ru ON ru.id = sp.review_by 
      WHERE msp.is_deleted = 0 
        AND msp.interior_id = ?
    `;

    const RndQuery = `
        SELECT 
        sr.id AS id,
        IFNULL(sr.keyobservation, '') AS keyobservation,
        IFNULL(sr.remarks, '') AS remarks,
        IFNULL(sr.summary, '') AS summary,
        IFNULL(sr.site_incharge, '') AS site_incharge,
        IFNULL(sr.authorized_person, '') AS authorized_person,
        IFNULL(sr.report, '') AS report,
        GROUP_CONCAT(rsi.images) AS image
        FROM interior_study_rnd AS sr
        LEFT JOIN interior_rnd_site_images AS rsi ON rsi.interior_id = sr.interior_id
        WHERE sr.is_deleted = 0 AND sr.interior_id = ?
        GROUP BY sr.id`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
      IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 2
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(SpQuery, [id], (err, SpResult) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }
      db.query(RndQuery, [id], (err2, rndResult) => {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        db.query(assignQuery, [id], (err3, assignResult) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: [],
            });
          }

          const mapType = (status) => {
            const val = typeof status === "string" ? status.toLowerCase() : "";
            return val === "approved" ? 1 : val === "reject" ? 2 : 0;
          };

          const groupedDc = {};

          SpResult.forEach((item) => {
            const key = item.id;

            if (!groupedDc[key]) {
              groupedDc[key] = {
                id: item.id,
                name: item.name,
                detail: [],
              };
            }

            groupedDc[key].detail.push({
              spid: item.spid,
              category_id: item.category_id,
              internalstatus: item.internalstatus,
              internalremark: item.internalremark,
              clientstatus: item.clientstatus,
              clientremark: item.clientremark,
              review_profile: item.review_profile,
              profile_picture: item.profile_picture,
              type: mapType(item.clientstatus),
              team_id: item.team_id,
              design_file: item.materialphoto,
              notes: item.notes,
            });
          });

          const Sp = Object.values(groupedDc);

          const Rnd = rndResult.map((item) => ({
            ...item,
            image: item.image
              ? item.image.split(",").filter(Boolean) // ✅ split into array
              : [],
          }));

          const assignmentDetails = assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          }));

          return res.status(201).json({
            error: false,
            message: "Record fetched",
            data: {
              Sp,
              Rnd,
              assignmentDetails,
            },
          });
        });
      });
    });
  },

  fetchmobileQuotation: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const feesQuery = `
      SELECT 
        id,
        IFNULL(price, '') AS price,
        IFNULL(remark, '') AS remark,
        IFNULL(status, '') AS status,
         IFNULL(is_done, '') AS is_done
      FROM mst_fees 
      WHERE is_deleted = 0 AND interior_id = ?;
    `;

    const VendorsQuery = `
    SELECT 
     mav.id AS mst_id,
      IFNULL(mav.name, '') AS name,
       IFNULL(av.id, '') AS avid,
      IFNULL(v.name, '') AS vendors,
      IFNULL(v.mobile, '') AS mobile_no,
      IFNULL(av.price, '') AS price,
      IFNULL(av.remark, '') AS remark,
    IFNULL(av.status, '') AS status
 FROM mst_quation AS mav
LEFT JOIN quotation AS av ON av.category_id = mav.id AND av.is_deleted = 0
left join vendors as v on v.id = av.vendors
WHERE mav.is_deleted = 0 
AND mav.interior_id =  ?;
  `;

    const ContractorQuery = `
  SELECT 
   mac.id AS mst_id,
    IFNULL(mac.name, '') AS name,
     IFNULL(ac.id, '') AS acid,
    IFNULL(v.name, '') AS vendors,
    IFNULL(v.mobile, '') AS mobile_no,
    IFNULL(ac.price, '') AS price,
    IFNULL(ac.remark, '') AS remark,
  IFNULL(ac.status, '') AS status
FROM mst_interior_contractor AS mac
LEFT JOIN interior_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
left join vendors as v on v.id = ac.vendors
WHERE mac.is_deleted = 0 
AND mac.interior_id =   ?;
`;

    const MaterialQuery = `
     SELECT 
          mam.id AS mam_id,
           IFNULL(mam.title, '') AS title,
          IFNULL(m.id,'') AS mid,
          IFNULL(v.name, '') AS vendors, 
          IFNULL(v.mobile, '') AS phone, 
          IFNULL(m.material_photo, '') AS material_photo,
          IFNULL(m.material_name, '') AS material_name,
          IFNULL(m.rate, '') AS rate,
          IFNULL(m.remark, '') AS remark,
          IFNULL(m.status, '') AS status,
            IFNULL(m.is_done, '') AS is_done
          FROM mst_material AS mam
          LEFT JOIN material AS m ON m.category_id = mam.id AND m.is_deleted = 0
          left join vendors as v on v.id = m.vendor
          WHERE mam.is_deleted = 0 
          AND mam.interior_id = ?;
    `;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
 IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 3
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(feesQuery, [id], (err, feesResult) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      db.query(VendorsQuery, [id], (err2, vendorResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }

        db.query(ContractorQuery, [id], (err3, contractorResult) => {
          if (err3) {
            return res
              .status(500)
              .json({ error: true, message: err3.sqlMessage, data: [] });
          }

          db.query(MaterialQuery, [id], (err4, materialResult) => {
            if (err4) {
              return res
                .status(500)
                .json({ error: true, message: err4.sqlMessage, data: [] });
            }

            db.query(assignQuery, [id], (err5, assignResult) => {
              if (err5) {
                return res
                  .status(500)
                  .json({ error: true, message: err5.sqlMessage, data: [] });
              }

              const mapType = (status) => {
                const val =
                  typeof status === "string" ? status.toLowerCase() : "";
                return val === "approved" ? 1 : val === "reject" ? 2 : 0;
              };

              const fees = feesResult.map((item) => ({
                ...item,
                type: mapType(item.status),
              }));

              const groupItems = (
                data,
                groupKey,
                nameKey,
                itemKey,
                detailKey,
              ) => {
                const grouped = {};
                data.forEach((item) => {
                  const key = item[groupKey];
                  if (!grouped[key]) {
                    grouped[key] = {
                      [groupKey]: key,
                      [nameKey]: item[nameKey],
                      [detailKey]: [],
                    };
                  }
                  const entry = { ...item };
                  delete entry[groupKey];
                  delete entry[nameKey];
                  entry.type = mapType(entry.status);
                  grouped[key][detailKey].push(entry);
                });
                return Object.values(grouped);
              };

              const vendor = groupItems(
                vendorResult,
                "mst_id",
                "name",
                "avid",
                "vendordetail",
              );
              const Contractor = groupItems(
                contractorResult,
                "mst_id",
                "name",
                "acid",
                "contractordetail",
              );
              const Material = groupItems(
                materialResult,
                "mam_id",
                "title",
                "mid",
                "materialdetail",
              );

              const assignmentDetails = assignResult.map((item) => ({
                ...item,
                assign_picture: item.assign_picture
                  ? item.assign_picture.split(",")
                  : [],
              }));

              return res.status(201).json({
                error: false,
                message: "Record fetched",
                data: [
                  {
                    fees,
                    vendor,
                    Contractor,
                    Material,
                    assignmentDetails,
                  },
                ],
              });
            });
          });
        });
      });
    });
  },

  fetchmobiletechnicaldrawing: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
        mad.id AS mad_id,
        mad.title,
        COALESCE(ad.id, 0) AS adid,
         IFNULL(u.profile_picture,'') as profile_picture,
         IFNULL(ru.profile_picture,'') AS review_profile,
        COALESCE(ad.internalstatus, '') AS internalstatus,
        COALESCE(ad.designphoto, '') AS designphoto,
         COALESCE(ad.category_id, '') AS category_id,
         COALESCE(ad.notes, '') AS notes,
        COALESCE(ad.internalremark, '') AS internalremark,
        COALESCE(ad.clientstatus, '') AS clientstatus,
        COALESCE(ad.clientremark, '') AS clientremark
        FROM mst_technical_drawing AS mad
        LEFT JOIN technicaldrawing AS ad ON ad.category_id = mad.id AND ad.is_deleted = 0
        LEFT JOIN users AS u ON u.id = ad.created_by 
       LEFT JOIN users AS ru ON ru.id = ad.review_by 
        WHERE mad.is_deleted = 0 
        AND mad.interior_id = ?`;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 6
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;

      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const groupedResult = result.reduce((acc, row) => {
          const madId = row.mad_id;

          if (!acc[madId]) {
            acc[madId] = {
              mad_id: row.mad_id,
              name: row.title,
              children: [],
            };
          }

          acc[madId].children.push({
            adid: row.adid,
            profile_picture: row.profile_picture,
            review_profile: row.review_profile,
            internalstatus: row.internalstatus,
            design: row.designphoto,
            category_id: row.category_id,
            notes: row.notes,
            internalremark: row.internalremark,
            clientstatus: row.clientstatus,
            clientremark: row.clientremark,
          });

          return acc;
        }, {});

        const formattedData = Object.values(groupedResult);

        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage, data: [] });
          }
          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  fetchmobileConsulantsbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const ThreedQuery = `
        SELECT 
        mt.id AS mt_id,
        IFNULL(td.vendor, '') AS vendor,
        IFNULL(td.phone, '') AS phone,
        IFNULL(mt.title, '') AS title,
        IFNULL(td.id, '') AS tdid,
        IFNULL(td.designphoto, '') AS designphoto,
        IFNULL(td.notes, '') AS notes,
        IFNULL(td.category_id, '') AS category_id,
        IFNULL(td.internalstatus, '') AS internalstatus,
        IFNULL(td.internalremark, '') AS internalremark,
        IFNULL(td.clientstatus, '') AS clientstatus,
        IFNULL(td.clientremark, '') AS clientremark,
        IFNULL(ru.profile_picture, '') AS review_profile,
        IFNULL(u.profile_picture, '') AS profile_picture
        FROM mst_threed AS mt
        LEFT JOIN threed AS td ON td.category_id = mt.id AND td.is_deleted = 0
        LEFT JOIN users AS u ON u.id = td.created_by 
        LEFT JOIN users AS ru ON ru.id = td.review_by 
        WHERE mt.is_deleted = 0 
        AND mt.interior_id =?;
    `;

    const StructureQuery = `
      SELECT 
        mas.id AS mad_id,
        IFNULL(mas.name, '') AS name,
        IFNULL(ars.id, '') AS asid,
        IFNULL(ars.zed_upload, '') AS zed_upload,
        IFNULL(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
        IFNULL(ars.agency_upload, '') AS agency_upload,
        IFNULL(ars.agency_name, '') AS agency_name,
        IFNULL(ars.internalstatus, '') AS internalstatus,
        IFNULL(ars.internalremark, '') AS internalremark,
        IFNULL(ars.clientstatus, '') AS clientstatus,
        IFNULL(ars.clientremark, '') AS clientremark,
        IFNULL(ars.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
  FROM mst_structure AS mas
  LEFT JOIN structure AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.interior_id = ?`;

    const MepfQuery = `
  SELECT 
        mas.id AS mad_id,
        IFNULL(mas.name, '') AS name,
        IFNULL(ars.id, '') AS asid,
        IFNULL(ars.zed_upload, '') AS zed_upload,
        IFNULL(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
        IFNULL(ars.agency_upload, '') AS agency_upload,
        IFNULL(ars.agency_name, '') AS agency_name,
        IFNULL(ars.internalstatus, '') AS internalstatus,
        IFNULL(ars.internalremark, '') AS internalremark,
        IFNULL(ars.clientstatus, '') AS clientstatus,
        IFNULL(ars.clientremark, '') AS clientremark,
        IFNULL(ars.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
  FROM mst_mepf AS mas
  LEFT JOIN mepf AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.interior_id = ?`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 5
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(ThreedQuery, [id], (err, ThreedResult) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      db.query(StructureQuery, [id], (err2, structureResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: {} });
        }

        db.query(MepfQuery, [id], (err3, MepfResult) => {
          if (err3) {
            return res
              .status(500)
              .json({ error: true, message: err3.sqlMessage, data: {} });
          }

          db.query(assignQuery, [id], (err4, assignResult) => {
            if (err4) {
              return res
                .status(500)
                .json({ error: true, message: err4.sqlMessage, data: {} });
            }

            const mapType = (status) => {
              const val = (status || "").toLowerCase();
              return val === "approved" ? 1 : val === "reject" ? 2 : 0;
            };

            const groupData = (
              data,
              groupKey1,
              groupKey2,
              fieldsToRemove,
              detailKey,
            ) => {
              const grouped = {};

              data.forEach((item) => {
                const key = `${item[groupKey1]}_${item[groupKey2]}`;
                const baseItem = {
                  [groupKey1]: item[groupKey1],
                  [groupKey2]: item[groupKey2],
                  [detailKey]: [],
                };

                const detail = { ...item };
                fieldsToRemove.forEach((k) => delete detail[k]);

                if (!grouped[key]) {
                  grouped[key] = baseItem;
                }

                detail.type = mapType(item.internalstatus || item.clientstatus);
                grouped[key][detailKey].push(detail);
              });

              return Object.values(grouped);
            };

            const Threed = groupData(
              ThreedResult,
              "mt_id",
              "title",
              ["mt_id", "title"],
              "ThreeDdetail",
            );
            const structure = groupData(
              structureResult,
              "mad_id",
              "name",
              ["mad_id", "name"],
              "structuredetail",
            );
            const Mepf = groupData(
              MepfResult,
              "mad_id",
              "name",
              ["mad_id", "name"],
              "mepfdetail",
            );

            const assignmentDetails = assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            }));

            return res.status(201).json({
              error: false,
              message: "Record fetched",
              data: [
                {
                  Threed,
                  structure,
                  Mepf,
                  assignmentDetails,
                },
              ],
            });
          });
        });
      });
    });
  },
  fetchmobileSchedule: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select 
       s.id,
      IFNULL(s.source_id,'') as source_id,
      IFNULL(s.type,'') as type,
      IFNULL(s.agency,'') as agency,
      IFNULL(s.status,'') as status,
      IFNULL(s.remark,'') as remark,
      IFNULL(s.status_remark,'') as status_remark,
       DATE_FORMAT(s.fromdate, '%d-%m-%Y') AS fromdate,
    DATE_FORMAT(s.todate, '%d-%m-%Y') AS todate,
    GROUP_CONCAT(u.first_name) AS first_name,
    GROUP_CONCAT(u.profile_picture) AS profile_picture
    from schedule as s
    left join  users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
    where s.is_deleted = 0 and s.source_type = 2 and s.source_id = ?
    GROUP BY 
     s.id,
      s.source_id,
      s.type,
      s.agency,
      s.remark,
      s.status
        `;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%Y-%m-%d') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%Y-%m-%d') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 7
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }
        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage });
          }

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result.map((item) => ({
              ...item,
              profile_picture: item.profile_picture
                ? item.profile_picture.split(",")
                : [],
              first_name: item.first_name ? item.first_name.split(",") : [],
            })),
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  fetchInteriormobileCalenderSchedule: (req, res) => {
    const id = parseInt(req.body.id);
    const dateInput = req.body?.month || ""; // e.g., "2025-01"

    // Extract year and month from input
    const year = moment(dateInput, "YYYY-MM").format("YYYY");
    const month = moment(dateInput, "YYYY-MM").format("MM");

    const sql = `
    SELECT 
      s.id,
      IFNULL(s.source_id, '') AS source_id,
      IFNULL(s.source_type, '') AS source_type,
      IFNULL(s.type, '') AS type,
      IFNULL(s.agency, '') AS agency,
      IFNULL(s.remark, '') AS remark,
      IFNULL(s.status, '') AS status,
      DATE_FORMAT(s.fromdate, '%Y-%m-%d') AS fromdate,
      DATE_FORMAT(s.todate, '%Y-%m-%d') AS todate,
      GROUP_CONCAT(u.profile_picture) AS profile_picture
    FROM schedule AS s
    LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
    WHERE s.is_deleted = 0 and s.source_type = 2
      AND s.source_id = ? 
      AND MONTH(s.fromdate) = ? 
      AND YEAR(s.fromdate) = ?
    GROUP BY s.id, s.source_id, s.type, s.agency, s.remark
  `;

    // Helper function to expand dates
    const expandDateRange = (record) => {
      const from = moment(record.fromdate);
      const to = moment(record.todate);
      const expanded = [];

      for (
        let date = moment(from);
        date.isSameOrBefore(to);
        date.add(1, "days")
      ) {
        expanded.push({
          ...record,
          date: date.format("YYYY-MM-DD"), // new field for each day
        });
      }

      return expanded;
    };

    db.query(sql, [id, month, year], (err, result) => {
      if (err) {
        res.status(500).json({
          error: total_uncompleted_prevdate_tasks,
          message: err.sqlMessage,
          data: [],
        });
      } else if (result.length > 0) {
        let expandedResults = [];
        result.forEach((record) => {
          expandedResults = expandedResults.concat(expandDateRange(record));
        });

        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: expandedResults,
        });
      } else {
        res.status(200).json({
          error: false,
          message: "Requested record not found",
          data: [],
        });
      }
    });
  },

  fetchmobileConcept: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const DcQuery = `
        SELECT 
        madc.id AS id,
        IFNULL(madc.title, '') AS title,
        IFNULL(adc.id, '') AS adcid,
        IFNULL(adc.category_id, '') AS category_id,
         IFNULL(adc.remark, '') AS remark,
          IFNULL(adc.design_photo, '') AS design_photo,
        IFNULL(adc.internalstatus, '') AS internalstatus,
        IFNULL(adc.internalremark, '') AS internalremark,
        IFNULL(adc.clientstatus, '') AS clientstatus,
        IFNULL(adc.clientremark, '') AS clientremark,
        IFNULL(ru.profile_picture, '') AS review_profile,
        IFNULL(u.profile_picture, '') AS profile_picture
    FROM mst_concept AS madc
LEFT JOIN concept AS adc ON adc.category_id = madc.id AND adc.is_deleted = 0
LEFT JOIN users AS u ON u.id = adc.created_by 
LEFT JOIN users AS ru ON ru.id = adc.review_by 
WHERE madc.is_deleted = 0 
AND madc.interior_id =?;
    `;

    const FinaldQuery = `
      SELECT 
        afd.id AS afd_id,
        IFNULL(afd.upload, '') AS upload,
        IFNULL(afd.type, '') AS type,
        IFNULL(afd.status, '') AS status,
        IFNULL(afd.statusremark, '') AS statusremark,
        IFNULL(afd.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
   from final_d as afd
      left join users as u
      on u.id = afd.created_by
      where afd.is_deleted = 0 and afd.interior_id =?`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
      IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 4
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(DcQuery, [id], (err, DcResult) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }
      db.query(FinaldQuery, [id], (err2, finaldResult) => {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        db.query(assignQuery, [id], (err3, assignResult) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: [],
            });
          }

          const mapType = (status) => {
            const val = typeof status === "string" ? status.toLowerCase() : "";
            return val === "approved" ? 1 : val === "reject" ? 2 : 0;
          };

          const groupedDc = {};

          DcResult.forEach((item) => {
            const key = item.id;

            if (!groupedDc[key]) {
              groupedDc[key] = {
                id: item.id,
                name: item.title,
                detail: [],
              };
            }

            groupedDc[key].detail.push({
              adcid: item.adcid,
              category_id: item.category_id,
              design_file: item.design_photo,
              remark: item.remark,
              internalstatus: item.internalstatus,
              internalremark: item.internalremark,
              clientstatus: item.clientstatus,
              clientremark: item.clientremark,
              review_profile: item.review_profile,
              profile_picture: item.profile_picture,
              type: mapType(item.clientstatus),
            });
          });

          const Dc = Object.values(groupedDc);

          const Finald = finaldResult.map((item) => ({
            ...item,
            // type: mapType(item.status),
          }));

          const assignmentDetails = assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          }));

          return res.status(201).json({
            error: false,
            message: "Record fetched",
            data: [
              {
                Dc,
                Finald,
                assignmentDetails,
              },
            ],
          });
        });
      });
    });
  },

  fetchmobileriskbyid: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select marm.id,
         IFNULL(marm.upload,'') as upload,
         IFNULL(marm.remark,'') as remark,
         IFNULL(marm.agency,'') as agency,
         IFNULL(u.profile_picture,'') as profile_picture,
        COALESCE(DATE_FORMAT(marm.date, '%d %b %Y %I:%i %p'), '') AS date
        from risk_matrix as marm
        left join users as u
        on u.id = marm.created_by
        where marm.is_deleted = 0 and marm.interior_id =?;
        `;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 3 AND nmfd.project_name = 8
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }
        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage });
          }

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result,
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  getapprovaldcbyID: (req, res) => {
    var id = parseInt(req.body.id);

    var sql = `
        SELECT 
        dc.id,
        IFNULL(nmd.doc_name, '') AS doc_name,
        IFNULL(dc.photo, '') AS photo,
        IFNULL(dc.doc_id, '') AS doc_id,
        IFNULL(dc.type, '') AS type
        FROM 
        document_collection as dc  
        LEFT JOIN 
        new_mst_document as nmd 
        ON 
        nmd.id = dc.doc_id 
        WHERE 
        dc.is_deleted = 0 
        AND 
        dc.document_clearance_id = ?`;

    const assignQuery = `SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') AS assign_to_hod,
        IFNULL(nmf.case_id,'') AS case_id,
        IFNULL(nmfd.assign_members,'') AS assign_members,
        IFNULL(nmfd.assign_on,'') AS assign_on,
        IFNULL(nmfd.completed_by,'') AS completed_by,
        IFNULL(mpd.title,'') AS title,
        IFNULL(hu.profile_picture,'')  AS hod_pictures,
        GROUP_CONCAT(u.profile_picture) AS assign_picture
        FROM 
        new_mst_file_details AS nmfd
        LEFT JOIN 
        new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN 
        mst_project_details AS mpd ON mpd.id = nmfd.project_name
        LEFT JOIN 
        users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN 
        users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE 
        nmf.id = ? and  mpd.title = "D.C." and nmfd.source_type =1
        GROUP BY 
        nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const staticTypes = ["owner", "license", "smc", "office"];

          const grouped = staticTypes.reduce((acc, type) => {
            acc[type] = [];
            return acc;
          }, {});

          result.forEach((doc) => {
            const type = doc.type || "unknown";
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push(doc);
          });

          return res.status(201).json({
            error: false,
            message: "Record fetched",
            data: [grouped],
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        } else {
          return res.status(201).json({
            error: true,
            message: "Requesting record not found",
            data: [
              {
                owner: [],
                license: [],
                smc: [],
                office: [],
              },
            ],
          });
        }
      });
    });
  },

  getmobilePvbyId: (req, res) => {
    var id = parseInt(req.body.id);

    var sql = `SELECT id,  IFNULL(DATE_FORMAT(application_date,'%Y-%m-%d'),'') AS application_date,  IFNULL(document_file,'') AS document_file,  IFNULL(DATE_FORMAT(pv_date,'%Y-%m-%d'), '') AS pv_date, IFNULL(pv_file,'') AS pv_file FROM pv WHERE is_deleted = 0 AND approval_id = ?`;

    const assignQuery = `SELECT 
    nmfd.id,
    IFNULL(nmfd.assign_to_hod,'') AS assign_to_hod,
    IFNULL(nmf.case_id,'') AS case_id,
    IFNULL(nmfd.assign_members,'') AS assign_members,
    IFNULL(nmfd.assign_on,'') AS assign_on,
    IFNULL(nmfd.completed_by,'') AS completed_by,
    IFNULL(mpd.title,'') AS title,
    IFNULL(hu.profile_picture,'')  AS hod_pictures,
    GROUP_CONCAT(u.profile_picture) AS assign_picture
    FROM 
    new_mst_file_details AS nmfd
    LEFT JOIN 
    new_mst_file AS nmf ON nmf.id = nmfd.project_id
    LEFT JOIN 
    mst_project_details AS mpd ON mpd.id = nmfd.project_name
    LEFT JOIN 
    users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
    LEFT JOIN 
    users AS hu ON hu.id = nmfd.assign_to_hod
    WHERE 
    nmf.id = ? and  mpd.title = "P.V." and nmfd.source_type =1
    GROUP BY 
    nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
    nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture`;

    // Execute the SQL query
    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }
      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }
        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: result,
          assignmentDetails: assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          })),
        });
      });
    });
  },

  getmobilefireNocbyId: (req, res) => {
    var id = parseInt(req.body.id);

    var sql = `SELECT id,IFNULL(DATE_FORMAT(assign_application_date,'%Y-%m-%d'),'') AS assign_application_date,  IFNULL(application_number,'') AS application_number,  IFNULL(DATE_FORMAT(received_application_date,'%Y-%m-%d'), '') AS received_application_date, IFNULL(fire_noc_receipt,'') AS fire_noc_receipt FROM fire_noc WHERE is_deleted = 0 AND approval_id = ?`;

    const assignQuery = `SELECT 
    nmfd.id,
    IFNULL(nmfd.assign_to_hod,'') AS assign_to_hod,
    IFNULL(nmf.case_id,'') AS case_id,
    IFNULL(nmfd.assign_members,'') AS assign_members,
    IFNULL(nmfd.assign_on,'') AS assign_on,
    IFNULL(nmfd.completed_by,'') AS completed_by,
    IFNULL(mpd.title,'') AS title,
    IFNULL(hu.profile_picture,'')  AS hod_pictures,
    GROUP_CONCAT(u.profile_picture) AS assign_picture
    FROM 
    new_mst_file_details AS nmfd
    LEFT JOIN 
    new_mst_file AS nmf ON nmf.id = nmfd.project_id
    LEFT JOIN 
    mst_project_details AS mpd ON mpd.id = nmfd.project_name
    LEFT JOIN 
    users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
    LEFT JOIN 
    users AS hu ON hu.id = nmfd.assign_to_hod
    WHERE 
    nmf.id = ? and  mpd.title = "Fire NOC" and nmfd.source_type =1
    GROUP BY 
    nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
    nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }
      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }
        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: result,
          assignmentDetails: assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          })),
        });
      });
    });
  },

  getmobileenagarInputbyId: (req, res) => {
    const id = parseInt(req.body.id);

    const sql = `
    select enmi.id,
     IFNULL(enmi.architecturename,'') AS architecturename,
     IFNULL(enmi.developername,'') AS developername,
     IFNULL(enmi.application_upload_date,'') AS application_upload_date,
     IFNULL(enmi.applicationnumber,'') AS applicationnumber,
     IFNULL(enmi.loginId,'') AS loginId,
     IFNULL(enmi.password,'') AS password,
     IFNULL(enid.id,'') AS enid_id,
     IFNULL(enid.upload_date,'') AS upload_date,
     IFNULL(enid.predcr_drawing,'') AS predcr_drawing,
     IFNULL(enid.query ,'') AS query
    from e_nagar_mst_input as  enmi
left join e_nagar_input_drawing as enid
on enid.e_nagar_mst_id = enmi.id
where enmi.approval_id = ? and enid.is_deleted = 0
  `;

    const assignQuery = `SELECT 
  nmfd.id,
  IFNULL(nmfd.assign_to_hod,'') AS assign_to_hod,
  IFNULL(nmf.case_id,'') AS case_id,
  IFNULL(nmfd.assign_members,'') AS assign_members,
  IFNULL(nmfd.assign_on,'') AS assign_on,
  IFNULL(nmfd.completed_by,'') AS completed_by,
  IFNULL(mpd.title,'') AS title,
  IFNULL(hu.profile_picture,'')  AS hod_pictures,
  GROUP_CONCAT(u.profile_picture) AS assign_picture
  FROM 
  new_mst_file_details AS nmfd
  LEFT JOIN 
  new_mst_file AS nmf ON nmf.id = nmfd.project_id
  LEFT JOIN 
  mst_project_details AS mpd ON mpd.id = nmfd.project_name
  LEFT JOIN 
  users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
  LEFT JOIN 
  users AS hu ON hu.id = nmfd.assign_to_hod
  WHERE 
  nmf.id = ? and  mpd.title = "E-Nagar Portal" and nmfd.source_type =1
  GROUP BY 
  nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
  nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const baseData = {
            id: result[0].id,
            approval_id: result[0].approval_id,
            architecturename: result[0].architecturename,
            developername: result[0].developername,
            application_upload_date: result[0].application_upload_date,
            applicationnumber: result[0].applicationnumber,
            loginId: result[0].loginId,
            password: result[0].password,
            created_by: result[0].created_by,
            created_at: result[0].created_at,
            updated_at: result[0].updated_at,
            updated_by: result[0].updated_by,
            is_deleted: result[0].is_deleted,
            drawings: [],
          };

          result.forEach((row) => {
            baseData.drawings.push({
              drawing_id: row.enid_id,
              upload_date: row.upload_date,
              predcr_drawing: row.predcr_drawing,
              query: row.query,
            });
          });

          return res.status(200).json({
            error: false,
            message: "Record fetched",
            data: [baseData],
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        } else {
          return res.status(404).json({
            error: true,
            message: "Requested record not found",
            data: [],
          });
        }
      });
    });
  },

  getmobileenagarOutputbyId: (req, res) => {
    const id = parseInt(req.body.id);

    const sql = `
        select enmo.id,
        IFNULL(enmo.smcassign_application,'') AS smcassign_application,
        IFNULL(enmo.smc_checker_predcrdrawing,'') AS smc_checker_predcrdrawing,
        IFNULL(enmo.permissionletter,'') AS permissionletter,
        IFNULL(enod.id,'') AS details_id,
        IFNULL(enod.status_date,'') AS status_date,
        IFNULL(enod.applicationstatus,'') AS applicationstatus
        from e_nagar_mst_output as enmo
        left join e_nagar_output_details as enod
        on enod.e_nagar_output_mst_id = enmo.id
        where enmo.approval_id = ? and enod.is_deleted = 0
  `;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (result.length > 0) {
        const baseData = {
          id: result[0].id,
          approval_id: result[0].approval_id,
          smcassign_application: result[0].smcassign_application,
          smc_checker_predcrdrawing: result[0].smc_checker_predcrdrawing,
          permissionletter: result[0].permissionletter,
          created_by: result[0].created_by,
          created_at: result[0].created_at,
          updated_at: result[0].updated_at,
          updated_by: result[0].updated_by,
          is_deleted: result[0].is_deleted,
          details: [],
        };

        result.forEach((row) => {
          let type = 0;
          if (row.applicationstatus.toLowerCase() === "approved") {
            type = 1;
          } else if (row.applicationstatus.toLowerCase() === "reject") {
            type = 2;
          }

          baseData.details.push({
            details_id: row.details_id,
            status_date: row.status_date,
            applicationstatus: row.applicationstatus,
            query: row.query,
            type: type,
          });
        });

        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: [baseData] });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requested record not found",
          data: [],
        });
      }
    });
  },

  getmobileInwardDetailsbyId: (req, res) => {
    var id = parseInt(req.body.id);

    var sql = `SELECT id,
     IFNULL(application_inward,'') AS application_inward,
     IFNULL(scruityfees,'') AS scruityfees,
     IFNULL(roaddeposit,'') AS roaddeposit
     FROM inward_details WHERE is_deleted = 0 AND approval_id = ?`;

    const assignQuery = `SELECT 
     nmfd.id,
     IFNULL(nmfd.assign_to_hod,'') AS assign_to_hod,
     IFNULL(nmf.case_id,'') AS case_id,
     IFNULL(nmfd.assign_members,'') AS assign_members,
     IFNULL(nmfd.assign_on,'') AS assign_on,
     IFNULL(nmfd.completed_by,'') AS completed_by,
     IFNULL(mpd.title,'') AS title,
     IFNULL(hu.profile_picture,'')  AS hod_pictures,
     GROUP_CONCAT(u.profile_picture) AS assign_picture
     FROM 
     new_mst_file_details AS nmfd
     LEFT JOIN 
     new_mst_file AS nmf ON nmf.id = nmfd.project_id
     LEFT JOIN 
     mst_project_details AS mpd ON mpd.id = nmfd.project_name
     LEFT JOIN 
     users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
     LEFT JOIN 
     users AS hu ON hu.id = nmfd.assign_to_hod
     WHERE 
     nmf.id = ? and  mpd.title = "E-Nagar Portal" and nmfd.source_type =1
     GROUP BY 
     nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
     nmfd.assign_on, nmfd.completed_by, mpd.title, hu.profile_picture`;

    // Execute the SQL query
    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }
      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }
        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: result,
          assignmentDetails: assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          })),
        });
      });
    });
  },

  getmobileoutewardbyId: (req, res) => {
    var id = parseInt(req.body.id);

    var sql = `SELECT id,
    IFNULL(building_date,'') AS building_date,
   IFNULL(building_letter,'') AS building_letter,
    IFNULL(approval_date,'') AS approval_date,
    IFNULL(approval_plan,'') AS approval_plan
     FROM outward_details WHERE is_deleted = 0 AND approval_id = ?`;

    // Execute the SQL query
    db.query(sql, [id], function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      } else {
        if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(404).json({
            error: true,
            message: "Requested record not found",
            data: [],
          });
        }
      }
    });
  },

  getmobileApprovalbyId: (req, res) => {
    const id = parseInt(req.body.id);

    const sql = `
      SELECT id,
        IFNULL(level, '') AS level,
        IFNULL(date, '') AS date,
        IFNULL(status, '') AS status,
        IFNULL(query, '') AS query,
        IFNULL(approved_letter, '') AS approved_letter
      FROM approval_process
      WHERE is_deleted = 0 AND approval_id = ?
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Requested record not found",
          data: [],
        });
      }
      const mapType = (status) => {
        const val = status.toLowerCase();
        return val === "approved" ? 1 : val === "reject" ? 2 : 0;
      };

      const officerByLevel = {
        "Level 1": "AE / JE",
        "Level 2": "DE",
        "Level 3": "Zone Officer",
        "Level 4": "DC",
        "Level 5": "Commissioner",
      };

      // Static levels
      const levels = ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5"];

      const groupedData = levels.map((level) => {
        const children = result
          .filter((item) => item.level === level)
          .map((item) => ({
            ...item,
            status_type: mapType(item.status),
            officer: officerByLevel[level] || "",
          }));

        return {
          level: level,
          id: children.length > 0 ? children[0].id : null,
          children: children,
        };
      });

      return res.status(200).json({
        error: false,
        message: "Record fetched",
        data: groupedData,
      });
    });
  },

  getmobilefsicfeesbyId: (req, res) => {
    var id = parseInt(req.body.id);

    var allfeesQuery = `SELECT id,
    IFNULL(receipt_no,'') AS receipt_no,
    IFNULL(fee_type,'') AS fee_type,
    IFNULL(amount,'') AS amount,
    IFNULL(date,'') AS date,
    IFNULL(file_upload,'') AS file_upload
    FROM all_important_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

    var workfeesQuery = `SELECT id,
    IFNULL(receipt_no,'') AS receipt_no,
    IFNULL(fee_type,'') AS fee_type,
    IFNULL(amount,'') AS amount,
    IFNULL(date,'') AS date,
    IFNULL(file_upload,'') AS file_upload
    FROM work_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

    var fsifeesQuery = `SELECT id,
     IFNULL(total_fsi_emi,'') AS total_fsi_emi,
     IFNULL(total_fsi_amount,'') AS total_fsi_amount,
     IFNULL(date,'') AS date,
     IFNULL(amount,'') AS amount,
     IFNULL(receivedDate,'') AS receivedDate,
     IFNULL(filePath,'') AS filePath
     FROM fsirows WHERE is_deleted = 0 AND approval_id = ${id}`;

    var icfeesQuery = `SELECT id,
     IFNULL(total_ic_emi,'') AS total_ic_emi,
     IFNULL(total_ic_amount,'') AS total_ic_amount,
     IFNULL(date,'') AS date,
     IFNULL(amount,'') AS amount,
     IFNULL(receivedDate,'') AS receivedDate,
     IFNULL(filePath,'') AS filePath
     FROM icrows WHERE is_deleted = 0 AND apporval_id = ${id}`;

    db.query(allfeesQuery, (err1, allfeesResult) => {
      if (err1)
        return res.status(500).json({ error: true, message: err1.sqlMessage });

      db.query(workfeesQuery, (err2, workfeesResult) => {
        if (err2)
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage });

        db.query(fsifeesQuery, (err3, fsifeesResult) => {
          if (err3)
            return res
              .status(500)
              .json({ error: true, message: err3.sqlMessage });

          db.query(icfeesQuery, (err4, icfeesResult) => {
            if (err4)
              return res
                .status(500)
                .json({ error: true, message: err4.sqlMessage });

            const responseData = {
              all_fees: allfeesResult,
              work_fees: workfeesResult,
              fsi_fees_summary: {
                total_fsi_emi: fsifeesResult[0]?.total_fsi_emi || "",
                total_fsi_amount: fsifeesResult[0]?.total_fsi_amount || "",
                fsi: fsifeesResult.map((row) => ({
                  date: row.date,
                  amount: row.amount,
                  receivedDate: row.receivedDate,
                  filePath: row.filePath,
                })),
              },
              ic_fees_summary: {
                total_ic_emi: icfeesResult[0]?.total_ic_emi || "",
                total_ic_amount: icfeesResult[0]?.total_ic_amount || "",
                ic: icfeesResult.map((row) => ({
                  date: row.date,
                  amount: row.amount,
                  receivedDate: row.receivedDate,
                  filePath: row.filePath,
                })),
              },
            };

            return res.status(200).json({
              error: false,
              message: "Record fetched",
              data: [responseData],
            });
          });
        });
      });
    });
  },

  fetchmobilearchbasicDetails: (req, res) => {
    const id = req.body.id;

    const basicQuery = `
      SELECT  
      bd.id AS bd_id,
      IFNULL(bd.project_detail,'') AS project_detail,
      IFNULL(bd.requirement,'') AS requirement,
      IFNULL(bd.scopework,'') AS scopework,
      IFNULL(nmf.company_name,'') AS company_name,
      IFNULL(nmf.email,'') AS email,
      IFNULL(nmf.phone,'') AS phone,
      IFNULL(nmf.authority,'') AS authority,
      IFNULL(nmf.google_location,'') AS google_location,
      IFNULL(nmf.lat,'') AS lat,
      nmf.long,
      IFNULL(nmf.land_type,'') AS land_type,
      IFNULL(nmf.op_no,'') AS op_no,
      IFNULL(nmf.ward_no,'') AS ward_no,
      IFNULL(nmf.cs_no,'') AS cs_no,
      IFNULL(nmf.fp_no,'') AS fp_no,
      IFNULL(nmf.rs_no,'') AS rs_no,
      IFNULL(nmf.address,'') AS address,
      IFNULL(u.first_name,'') as client_name,
       IFNULL(mptc.id,'') as category_id,
      IFNULL(mptc.title,'') AS title,
       IFNULL(v.name,'') AS village,
       IFNULL(mc.name,'') AS project_type,
       IFNULL(tp.tpscheme,'') AS tpscheme,
      IFNULL(mctq.id,'') AS question_id, 
      IFNULL(mctq.title,'') AS question,
      IFNULL(mqa.answer,'') AS answer
      FROM new_mst_file AS nmf
      LEFT JOIN arch_basic_details AS bd ON bd.arch_id = nmf.id
      LEFT JOIN users AS u ON u.id = nmf.client_id
       left join mst_category as mc on mc.id = nmf.project_type
        left join village as v on v.id = nmf.village
      left join tpscheme as tp on tp.id = nmf.tpscheme
      LEFT JOIN mst_project_type_category AS mptc ON mptc.project_type_id = nmf.archcategory
      LEFT JOIN mst_category_type_question AS mctq ON mctq.category_id = mptc.id and mctq.type = 1
      LEFT JOIN mst_question_answer AS mqa ON mqa.question_id = mctq.id
      WHERE nmf.id = ? 
      `;

    // Second query: assignment details
    const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
      IFNULL(DATE_FORMAT(nmfd.assign_on, '%Y-%m-%d'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%Y-%m-%d'), '') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 1
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;

    db.query(basicQuery, [id], (err, basicResult) => {
      if (err) {
        return res.status(500).json({ error: true, message: err.sqlMessage });
      }

      // Format question-answers grouped by category
      const questionMap = {};
      const basicData = {};

      basicResult.forEach((row) => {
        if (!basicData.id) {
          basicData.id = row.bd_id;
          basicData.requirement = row.requirement;
          basicData.company_name = row.company_name;
          basicData.email = row.email;
          basicData.phone = row.phone;
          basicData.client_name = row.client_name;
          basicData.scopework = row.scopework;
          basicData.project_detail = row.project_detail;
          basicData.project_type = row.project_type;
          basicData.lat = row.lat;
          basicData.long = row.long;
          basicData.land_type = row.land_type;
          basicData.op_no = row.op_no;
          basicData.ward_no = row.ward_no;
          basicData.cs_no = row.cs_no;
          basicData.fp_no = row.fp_no;
          basicData.rs_no = row.rs_no;
          basicData.address = row.address;
          basicData.authority = row.authority;
          basicData.village = row.village;
          basicData.tpscheme = row.tpscheme;
          basicData.category = row.category;
        }

        if (row.category_id) {
          if (!questionMap[row.category_id]) {
            questionMap[row.category_id] = {
              id: row.category_id,
              title: row.title,
              question: [],
            };
          }
          if (row.question_id) {
            questionMap[row.category_id].question.push({
              id: row.question_id,
              name: row.question,
              answer: row.answer,
            });
          }
        }
      });

      const questions = Object.values(questionMap);

      db.query(assignQuery, [id], (err2, assignResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage });
        }
        return res.status(200).json({
          success: true,
          message: "Record fetched",
          data: [
            {
              ...basicData,
              questionAnswer: questions,
              assignmentDetails: assignResult.map((item) => ({
                ...item,
                assign_picture: item.assign_picture
                  ? item.assign_picture.split(",")
                  : [],
              })),
            },
          ],
        });
      });
    });
  },

  fetchmobilearchSpbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const SpQuery = `
        SELECT 
         masp.id AS id,
        IFNULL(masp.name, '') AS name,
        IFNULL(asp.id, '') AS aspid,
         IFNULL(asp.design_file, '') AS design_file,
          IFNULL(asp.notes, '') AS notes,
        IFNULL(asp.category_id, '') AS category_id,
        IFNULL(asp.internalstatus, '') AS internalstatus,
        IFNULL(asp.internalremark, '') AS internalremark,
        IFNULL(asp.clientstatus, '') AS clientstatus,
        IFNULL(asp.clientremark, '') AS clientremark,
        IFNULL(ru.profile_picture, '') AS review_profile,
        IFNULL(u.profile_picture, '') AS profile_picture
FROM mst_arch_space_planning AS masp
LEFT JOIN arch_space_planning AS asp ON asp.category_id = masp.id AND asp.is_deleted = 0
LEFT JOIN users AS u ON u.id = asp.created_by 
LEFT JOIN users AS ru ON ru.id = asp.review_by 
WHERE masp.is_deleted = 0 
AND masp.arch_id = ?;
    `;

    const RndQuery = `
        SELECT 
        sr.id AS id,
        IFNULL(sr.keyobservation, '') AS keyobservation,
        IFNULL(sr.remarks, '') AS remarks,
        IFNULL(sr.summary, '') AS summary,
        IFNULL(sr.site_incharge, '') AS site_incharge,
        IFNULL(sr.authorized_person, '') AS authorized_person,
        IFNULL(sr.report, '') AS report,
        COALESCE(GROUP_CONCAT(rsi.images), '') AS image
        FROM study_rnd AS sr
        LEFT JOIN rnd_site_images AS rsi ON rsi.arch_id = sr.arch_id
        WHERE sr.is_deleted = 0 AND sr.arch_id = ?
        GROUP BY sr.id`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
      IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 2
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(SpQuery, [id], (err, SpResult) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }
      db.query(RndQuery, [id], (err2, rndResult) => {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        db.query(assignQuery, [id], (err3, assignResult) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: [],
            });
          }

          const mapType = (status) => {
            const val = typeof status === "string" ? status.toLowerCase() : "";
            return val === "approved" ? 1 : val === "reject" ? 2 : 0;
          };

          const groupedDc = {};

          SpResult.forEach((item) => {
            const key = item.id;

            if (!groupedDc[key]) {
              groupedDc[key] = {
                id: item.id,
                name: item.name,
                detail: [],
              };
            }

            groupedDc[key].detail.push({
              aspid: item.aspid,
              category_id: item.category_id,
              internalstatus: item.internalstatus,
              internalremark: item.internalremark,
              clientstatus: item.clientstatus,
              notes: item.notes,
              design_file: item.design_file,
              clientremark: item.clientremark,
              review_profile: item.review_profile,
              profile_picture: item.profile_picture,
              type: mapType(item.clientstatus),
            });
          });

          const Sp = Object.values(groupedDc);

          const Rnd = rndResult.map((item) => ({
            ...item,
            image: item.image
              ? item.image.split(",").filter(Boolean) // ✅ split into array
              : [],
          }));

          const assignmentDetails = assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          }));

          return res.status(201).json({
            error: false,
            message: "Record fetched",
            data: {
              Sp,
              Rnd,
              assignmentDetails,
            },
          });
        });
      });
    });
  },

  fetchmobilearchquoationbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const feesQuery = `
      SELECT 
        id,
        IFNULL(price, '') AS price,
        IFNULL(remark, '') AS remark,
        IFNULL(status, '') AS status
      FROM mst_arch_fees 
      WHERE is_deleted = 0 AND arch_id = ?;
    `;

    const VendorsQuery = `
   SELECT 
     mav.id AS mst_id,
      IFNULL(mav.name, '') AS name,
       IFNULL(av.id, '') AS avid,
      IFNULL(v.name, '') AS vendors,
      IFNULL(v.mobile, '') AS mobile_no,
      IFNULL(av.price, '') AS price,
      IFNULL(av.remark, '') AS remark,
    IFNULL(av.status, '') AS status
 FROM mst_arch_vendor AS mav
LEFT JOIN arch_vendor AS av ON av.category_id = mav.id AND av.is_deleted = 0
left join vendors as v on v.id = av.vendors
WHERE mav.is_deleted = 0 
AND mav.arch_id =  ?;
  `;

    const ContractorQuery = `
  SELECT 
   mac.id AS mst_id,
    IFNULL(mac.name, '') AS name,
     IFNULL(ac.id, '') AS acid,
    IFNULL(v.name, '') AS vendors,
    IFNULL(v.mobile, '') AS mobile_no,
    IFNULL(ac.price, '') AS price,
    IFNULL(ac.remark, '') AS remark,
  IFNULL(ac.status, '') AS status
FROM mst_arch_contractor AS mac
LEFT JOIN arch_contractor AS ac ON ac.category_id = mac.id AND ac.is_deleted = 0
left join vendors as v on v.id = ac.vendors
WHERE mac.is_deleted = 0 
AND mac.arch_id =   ?;
`;

    const MaterialQuery = `
     SELECT 
          mam.id AS mam_id,
           IFNULL(mam.title, '') AS title,
          IFNULL(m.id,'') AS mid,
          IFNULL(v.name, '') AS vendors, 
          IFNULL(v.mobile, '') AS phone, 
          IFNULL(m.material_photo, '') AS material_photo,
          IFNULL(m.material_name, '') AS material_name,
          IFNULL(m.rate, '') AS rate,
          IFNULL(m.remark, '') AS remark,
          IFNULL(m.status, '') AS status
          FROM mst_arch_material AS mam
          LEFT JOIN arch_material AS m ON m.category_id = mam.id AND m.is_deleted = 0
          left join vendors as v on v.id = m.vendor
          WHERE mam.is_deleted = 0 
          AND mam.arch_id = ?;
    `;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
 IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 3
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(feesQuery, [id], (err, feesResult) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      db.query(VendorsQuery, [id], (err2, vendorResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: [] });
        }

        db.query(ContractorQuery, [id], (err3, contractorResult) => {
          if (err3) {
            return res
              .status(500)
              .json({ error: true, message: err3.sqlMessage, data: [] });
          }

          db.query(MaterialQuery, [id], (err4, materialResult) => {
            if (err4) {
              return res
                .status(500)
                .json({ error: true, message: err4.sqlMessage, data: [] });
            }

            db.query(assignQuery, [id], (err5, assignResult) => {
              if (err5) {
                return res
                  .status(500)
                  .json({ error: true, message: err5.sqlMessage, data: [] });
              }

              const mapType = (status) => {
                const val =
                  typeof status === "string" ? status.toLowerCase() : "";
                return val === "approved" ? 1 : val === "reject" ? 2 : 0;
              };

              const fees = feesResult.map((item) => ({
                ...item,
                type: mapType(item.status),
              }));

              const groupItems = (
                data,
                groupKey,
                nameKey,
                itemKey,
                detailKey,
              ) => {
                const grouped = {};
                data.forEach((item) => {
                  const key = item[groupKey];
                  if (!grouped[key]) {
                    grouped[key] = {
                      [groupKey]: key,
                      [nameKey]: item[nameKey],
                      [detailKey]: [],
                    };
                  }
                  const entry = { ...item };
                  delete entry[groupKey];
                  delete entry[nameKey];
                  entry.type = mapType(entry.status);
                  grouped[key][detailKey].push(entry);
                });
                return Object.values(grouped);
              };

              const vendor = groupItems(
                vendorResult,
                "mst_id",
                "name",
                "avid",
                "vendordetail",
              );
              const Contractor = groupItems(
                contractorResult,
                "mst_id",
                "name",
                "acid",
                "contractordetail",
              );
              const Material = groupItems(
                materialResult,
                "mam_id",
                "title",
                "mid",
                "materialdetail",
              );

              const assignmentDetails = assignResult.map((item) => ({
                ...item,
                assign_picture: item.assign_picture
                  ? item.assign_picture.split(",")
                  : [],
              }));

              return res.status(201).json({
                error: false,
                message: "Record fetched",
                data: [
                  {
                    fees,
                    vendor,
                    Contractor,
                    Material,
                    assignmentDetails,
                  },
                ],
              });
            });
          });
        });
      });
    });
  },

  fetchmobilearchDesignconceptsbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const DcQuery = `
        SELECT 
        madc.id AS id,
        IFNULL(madc.name, '') AS name,
        IFNULL(adc.id, '') AS adcid,
          IFNULL(adc.design_file, '') AS design_file,
            IFNULL(adc.notes, '') AS notes,
        IFNULL(adc.category_id, '') AS category_id,
        IFNULL(adc.internalstatus, '') AS internalstatus,
        IFNULL(adc.internalremark, '') AS internalremark,
        IFNULL(adc.clientstatus, '') AS clientstatus,
        IFNULL(adc.clientremark, '') AS clientremark,
        IFNULL(ru.profile_picture, '') AS review_profile,
        IFNULL(u.profile_picture, '') AS profile_picture
    FROM mst_arch_dc AS madc
LEFT JOIN arch_design_concept AS adc ON adc.category_id = madc.id AND adc.is_deleted = 0
LEFT JOIN users AS u ON u.id = adc.created_by 
LEFT JOIN users AS ru ON ru.id = adc.review_by 
WHERE madc.is_deleted = 0 
AND madc.arch_id =?;
    `;

    const FinaldQuery = `
      SELECT 
        afd.id AS afd_id,
        IFNULL(afd.upload, '') AS upload,
        IFNULL(afd.type, '') AS type,
        IFNULL(afd.status, '') AS status,
        IFNULL(afd.statusremark, '') AS statusremark,
        IFNULL(afd.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
   from arch_finald as afd
      left join users as u
      on u.id = afd.created_by
      where afd.is_deleted = 0 and afd.arch_id =?`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
      IFNULL(DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y'), '') AS assign_on,
IFNULL(DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y'), '') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 4
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(DcQuery, [id], (err, DcResult) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }
      db.query(FinaldQuery, [id], (err2, finaldResult) => {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        db.query(assignQuery, [id], (err3, assignResult) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: [],
            });
          }

          const mapType = (status) => {
            const val = typeof status === "string" ? status.toLowerCase() : "";
            return val === "approved" ? 1 : val === "reject" ? 2 : 0;
          };

          const groupedDc = {};

          DcResult.forEach((item) => {
            const key = item.id;

            if (!groupedDc[key]) {
              groupedDc[key] = {
                id: item.id,
                name: item.name,
                detail: [],
              };
            }

            groupedDc[key].detail.push({
              adcid: item.adcid,
              category_id: item.category_id,
              internalstatus: item.internalstatus,
              internalremark: item.internalremark,
              clientstatus: item.clientstatus,
              design_file: item.design_file,
              clientremark: item.clientremark,
              notes: item.notes,
              review_profile: item.review_profile,
              profile_picture: item.profile_picture,
              type: mapType(item.clientstatus),
            });
          });

          const Dc = Object.values(groupedDc);

          const Finald = finaldResult.map((item) => ({
            ...item,
            // type: mapType(item.status),
          }));

          const assignmentDetails = assignResult.map((item) => ({
            ...item,
            assign_picture: item.assign_picture
              ? item.assign_picture.split(",")
              : [],
          }));

          return res.status(201).json({
            error: false,
            message: "Record fetched",
            data: [
              {
                Dc,
                Finald,
                assignmentDetails,
              },
            ],
          });
        });
      });
    });
  },

  fetchmobilearchConsulantsbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res.status(201).json({
        error: true,
        message: "Id is required",
        data: {},
      });
    }

    const ThreedQuery = `
        SELECT 
        mt.id AS mt_id,
        IFNULL(td.vendor, '') AS vendor,
        IFNULL(td.phone, '') AS phone,
        IFNULL(mt.title, '') AS title,
        IFNULL(td.id, '') AS tdid,
        IFNULL(td.designphoto, '') AS designphoto,
        IFNULL(td.notes, '') AS notes,
        IFNULL(td.category_id, '') AS category_id,
        IFNULL(td.internalstatus, '') AS internalstatus,
        IFNULL(td.internalremark, '') AS internalremark,
        IFNULL(td.clientstatus, '') AS clientstatus,
        IFNULL(td.clientremark, '') AS clientremark,
        IFNULL(ru.profile_picture, '') AS review_profile,
        IFNULL(u.profile_picture, '') AS profile_picture
        FROM mst_arch_threed AS mt
        LEFT JOIN arch_threed AS td ON td.category_id = mt.id AND td.is_deleted = 0
        LEFT JOIN users AS u ON u.id = td.created_by 
        LEFT JOIN users AS ru ON ru.id = td.review_by 
        WHERE mt.is_deleted = 0 
        AND mt.arch_id =?;
    `;

    const StructureQuery = `
      SELECT 
        mas.id AS mad_id,
        IFNULL(mas.name, '') AS name,
        IFNULL(ars.id, '') AS asid,
        IFNULL(ars.zed_upload, '') AS zed_upload,
        IFNULL(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
        IFNULL(ars.agency_upload, '') AS agency_upload,
        IFNULL(ars.agency_name, '') AS agency_name,
        IFNULL(ars.internalstatus, '') AS internalstatus,
        IFNULL(ars.internalremark, '') AS internalremark,
        IFNULL(ars.clientstatus, '') AS clientstatus,
        IFNULL(ars.clientremark, '') AS clientremark,
        IFNULL(ars.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
  FROM mst_arch_structure AS mas
  LEFT JOIN arch_structure AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?`;

    const MepfQuery = `
  SELECT 
        mas.id AS mad_id,
        IFNULL(mas.name, '') AS name,
        IFNULL(ars.id, '') AS asid,
        IFNULL(ars.zed_upload, '') AS zed_upload,
        IFNULL(DATE_FORMAT(ars.created_at, '%d %b %Y'), '') AS date,
        IFNULL(ars.agency_upload, '') AS agency_upload,
        IFNULL(ars.agency_name, '') AS agency_name,
        IFNULL(ars.internalstatus, '') AS internalstatus,
        IFNULL(ars.internalremark, '') AS internalremark,
        IFNULL(ars.clientstatus, '') AS clientstatus,
        IFNULL(ars.clientremark, '') AS clientremark,
        IFNULL(ars.remark, '') AS remark,
        IFNULL(u.profile_picture, '') AS profile_picture
  FROM mst_arch_mepf AS mas
  LEFT JOIN arch_mepf AS ars ON ars.category_id = mas.id AND ars.is_deleted = 0
  LEFT JOIN users AS u ON u.id = ars.created_by 
  WHERE mas.is_deleted = 0 
  AND mas.arch_id = ?`;

    const assignQuery = `
      SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod, '') AS assign_to_hod,
        IFNULL(nmf.case_id, '') AS case_id,
        IFNULL(nmfd.assign_members, '') AS assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title, '') AS title,
        IFNULL(hu.profile_picture, '') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
      FROM new_mst_file_details AS nmfd
      LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
      LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
      LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
      LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
      WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 5
      GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
               nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture;
    `;

    db.query(ThreedQuery, [id], (err, ThreedResult) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      db.query(StructureQuery, [id], (err2, structureResult) => {
        if (err2) {
          return res
            .status(500)
            .json({ error: true, message: err2.sqlMessage, data: {} });
        }

        db.query(MepfQuery, [id], (err3, MepfResult) => {
          if (err3) {
            return res
              .status(500)
              .json({ error: true, message: err3.sqlMessage, data: {} });
          }

          db.query(assignQuery, [id], (err4, assignResult) => {
            if (err4) {
              return res
                .status(500)
                .json({ error: true, message: err4.sqlMessage, data: {} });
            }

            const mapType = (status) => {
              const val = (status || "").toLowerCase();
              return val === "approved" ? 1 : val === "reject" ? 2 : 0;
            };

            const groupData = (
              data,
              groupKey1,
              groupKey2,
              fieldsToRemove,
              detailKey,
            ) => {
              const grouped = {};

              data.forEach((item) => {
                const key = `${item[groupKey1]}_${item[groupKey2]}`;
                const baseItem = {
                  [groupKey1]: item[groupKey1],
                  [groupKey2]: item[groupKey2],
                  [detailKey]: [],
                };

                const detail = { ...item };
                fieldsToRemove.forEach((k) => delete detail[k]);

                if (!grouped[key]) {
                  grouped[key] = baseItem;
                }

                detail.type = mapType(item.internalstatus || item.clientstatus);
                grouped[key][detailKey].push(detail);
              });

              return Object.values(grouped);
            };

            const Threed = groupData(
              ThreedResult,
              "mt_id",
              "title",
              ["mt_id", "title"],
              "ThreeDdetail",
            );
            const structure = groupData(
              structureResult,
              "mad_id",
              "name",
              ["mad_id", "name"],
              "structuredetail",
            );
            const Mepf = groupData(
              MepfResult,
              "mad_id",
              "name",
              ["mad_id", "name"],
              "mepfdetail",
            );

            const assignmentDetails = assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            }));

            return res.status(201).json({
              error: false,
              message: "Record fetched",
              data: [
                {
                  Threed,
                  structure,
                  Mepf,
                  assignmentDetails,
                },
              ],
            });
          });
        });
      });
    });
  },
  mobilearchdrwaingbyid: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      let sql = `SELECT 
        mad.id AS mad_id,
        mad.name,
        COALESCE(ad.id, 0) AS adid,
         IFNULL(u.profile_picture,'') as profile_picture,
         IFNULL(ru.profile_picture,'') AS review_profile,
        COALESCE(ad.internalstatus, '') AS internalstatus,
        COALESCE(ad.design, '') AS design,
        COALESCE(ad.internalremark, '') AS internalremark,
        COALESCE(ad.clientstatus, '') AS clientstatus,
        COALESCE(ad.clientremark, '') AS clientremark
        FROM mst_arch_drawing AS mad
        LEFT JOIN arch_drawing AS ad ON ad.category_id = mad.id AND ad.is_deleted = 0
        LEFT JOIN users AS u ON u.id = ad.created_by 
       LEFT JOIN users AS ru ON ru.id = ad.review_by 
        WHERE mad.is_deleted = 0 
        AND mad.arch_id = ?`;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 6
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;

      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const groupedResult = result.reduce((acc, row) => {
          const madId = row.mad_id;

          if (!acc[madId]) {
            acc[madId] = {
              mad_id: row.mad_id,
              name: row.name,
              children: [],
            };
          }

          acc[madId].children.push({
            adid: row.adid,
            profile_picture: row.profile_picture,
            review_profile: row.review_profile,
            internalstatus: row.internalstatus,
            design: row.design,
            internalremark: row.internalremark,
            clientstatus: row.clientstatus,
            clientremark: row.clientremark,
          });

          return acc;
        }, {});

        const formattedData = Object.values(groupedResult);

        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage, data: [] });
          }
          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  fetchmobilearchSchedulebyid: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select 
       s.id,
      IFNULL(s.source_id,'') as source_id,
      IFNULL(s.type,'') as type,
      IFNULL(s.agency,'') as agency,
      IFNULL(s.status,'') as status,
      IFNULL(s.remark,'') as remark,
      IFNULL(s.status_remark,'') as status_remark,
       DATE_FORMAT(s.fromdate, '%d-%m-%Y') AS fromdate,
    DATE_FORMAT(s.todate, '%d-%m-%Y') AS todate,
    GROUP_CONCAT(u.first_name) AS first_name,
    GROUP_CONCAT(u.profile_picture) AS profile_picture
    from schedule as s
    left join  users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
    where s.is_deleted = 0 and s.source_type = 1 and s.source_id = ?
    GROUP BY 
     s.id,
      s.source_id,
      s.type,
      s.agency,
      s.remark,
      s.status
        `;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%Y-%m-%d') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%Y-%m-%d') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 7
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }
        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage });
          }

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result.map((item) => ({
              ...item,
              profile_picture: item.profile_picture
                ? item.profile_picture.split(",")
                : [],
              first_name: item.first_name ? item.first_name.split(",") : [],
            })),
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  fetchmobileCalenderSchedule: (req, res) => {
    const id = parseInt(req.body.id);
    const dateInput = req.body?.month || ""; // e.g., "2025-01"

    // Extract year and month from input
    const year = moment(dateInput, "YYYY-MM").format("YYYY");
    const month = moment(dateInput, "YYYY-MM").format("MM");

    const sql = `
    SELECT 
      s.id,
      IFNULL(s.source_id, '') AS source_id,
      IFNULL(s.source_type, '') AS source_type,
      IFNULL(s.type, '') AS type,
      IFNULL(s.agency, '') AS agency,
      IFNULL(s.remark, '') AS remark,
      IFNULL(s.status, '') AS status,
      DATE_FORMAT(s.fromdate, '%Y-%m-%d') AS fromdate,
      DATE_FORMAT(s.todate, '%Y-%m-%d') AS todate,
      GROUP_CONCAT(u.profile_picture) AS profile_picture
    FROM schedule AS s
    LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(s.team_member, '[', ''), ']', ''))
    WHERE s.is_deleted = 0 and s.source_type = 1
      AND s.source_id = ? 
      AND MONTH(s.fromdate) = ? 
      AND YEAR(s.fromdate) = ?
    GROUP BY s.id, s.source_id, s.type, s.agency, s.remark
  `;

    // Helper function to expand dates
    const expandDateRange = (record) => {
      const from = moment(record.fromdate);
      const to = moment(record.todate);
      const expanded = [];

      for (
        let date = moment(from);
        date.isSameOrBefore(to);
        date.add(1, "days")
      ) {
        expanded.push({
          ...record,
          date: date.format("YYYY-MM-DD"), // new field for each day
        });
      }

      return expanded;
    };

    db.query(sql, [id, month, year], (err, result) => {
      if (err) {
        res.status(500).json({
          error: total_uncompleted_prevdate_tasks,
          message: err.sqlMessage,
          data: [],
        });
      } else if (result.length > 0) {
        let expandedResults = [];
        result.forEach((record) => {
          expandedResults = expandedResults.concat(expandDateRange(record));
        });

        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: expandedResults,
        });
      } else {
        res.status(200).json({
          error: false,
          message: "Requested record not found",
          data: [],
        });
      }
    });
  },

  fetchmobilearchriskbyid: (req, res) => {
    var id = parseInt(req.body.id);

    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `select marm.id,
         IFNULL(marm.upload,'') as upload,
         IFNULL(marm.remark,'') as remark,
         IFNULL(marm.agency,'') as agency,
         IFNULL(u.profile_picture,'') as profile_picture,
        COALESCE(DATE_FORMAT(marm.date, '%d %b %Y %I:%i %p'), '') AS date
        from mst_arch_risk_matrix as marm
        left join users as u
        on u.id = marm.created_by
        where marm.is_deleted = 0 and marm.arch_id =?;
        `;

      const assignQuery = `
        SELECT 
        nmfd.id,
        IFNULL(nmfd.assign_to_hod,'') as assign_to_hod,
        IFNULL(nmf.case_id,'') as case_id,
        IFNULL(nmfd.assign_members, '' ) as assign_members,
        DATE_FORMAT(nmfd.assign_on, '%d-%m-%Y') AS assign_on,
        DATE_FORMAT(nmfd.completed_by, '%d-%m-%Y') AS completed_by,
        IFNULL(mid.title,'') as title,
        IFNULL(hu.profile_picture,'') AS hod_pictures,
        IFNULL(GROUP_CONCAT(u.profile_picture), '') AS assign_picture
        FROM new_mst_file_details AS nmfd
        LEFT JOIN new_mst_file AS nmf ON nmf.id = nmfd.project_id
        LEFT JOIN mst_arch_details AS mid ON mid.id = nmfd.project_name
        LEFT JOIN users AS u ON FIND_IN_SET(u.id, REPLACE(REPLACE(nmfd.assign_members, '[', ''), ']', ''))
        LEFT JOIN users AS hu ON hu.id = nmfd.assign_to_hod
        WHERE nmfd.project_id = ? AND nmfd.source_type = 2 AND nmfd.project_name = 8
        GROUP BY nmfd.id, nmfd.assign_to_hod, nmf.case_id, nmfd.assign_members, 
        nmfd.assign_on, nmfd.completed_by, mid.title, hu.profile_picture
        `;
      db.query(sql, [id], function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }
        db.query(assignQuery, [id], (err2, assignResult) => {
          if (err2) {
            return res
              .status(500)
              .json({ error: true, message: err2.sqlMessage });
          }

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result,
            assignmentDetails: assignResult.map((item) => ({
              ...item,
              assign_picture: item.assign_picture
                ? item.assign_picture.split(",")
                : [],
            })),
          });
        });
      });
    }
  },

  fetchclientApproval: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
      nmf.id, 
      IFNULL(nmf.case_id, '') AS case_id,
      IFNULL(nmf.project_name, '') AS project_name,
      IFNULL(nmf.authority, '') AS authority,
      IFNULL(tp.tpscheme, '') AS tpscheme,
      IFNULL(nmf.op_no, '') AS op_no,
      IFNULL(nmf.fp_no, '') AS fp_no,
      IFNULL(nmf.b_no, '') AS b_no,
      IFNULL(nmf.rs_no, '') AS rs_no,
      IFNULL(nmf.ward_no, '') AS ward_no,
      IFNULL(nmf.moje, '') AS moje,
      IFNULL(mpt.title, '') AS category,
      IFNULL(nmf.tentative_design, '') AS tentative_design,
      IFNULL(mc.name, '') AS projectType, 
      IFNULL(mpt.title, '') AS category, 
      IFNULL(v.name, '') AS village, 
      IFNULL(u.first_name, '') as client_name
      FROM 
      new_mst_file AS nmf
      LEFT JOIN 
      mst_category AS mc ON mc.id = nmf.project_type
      LEFT JOIN 
      mst_project_type AS mpt ON mpt.id = nmf.category
      LEFT JOIN 
      village AS v ON v.id = nmf.village
      LEFT JOIN 
      tpscheme AS tp ON tp.id = nmf.tpscheme
      left join users as u on u.id = nmf.client_id
      LEFT JOIN 
      new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE 
      nmf.is_deleted = 0   and nmfpd.application_name = "approval_process" and nmf.client_id = ?`;

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: [], error: true });
    }
  },

  fetchClientInterior: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
    nmf.id, 
IFNULL(nmf.case_id, '') AS case_id,
      IFNULL(nmf.project_name, '') AS project_name,
      IFNULL(nmf.authority, '') AS authority,
      IFNULL(tp.tpscheme, '') AS tpscheme,
      IFNULL(nmf.op_no, '') AS op_no,
      IFNULL(nmf.fp_no, '') AS fp_no,
      IFNULL(nmf.b_no, '') AS b_no,
      IFNULL(nmf.rs_no, '') AS rs_no,
      IFNULL(nmf.ward_no, '') AS ward_no,
      IFNULL(nmf.moje, '') AS moje,
      IFNULL(mpt.title, '') AS category,
      IFNULL(nmf.tentative_design, '') AS tentative_design,
      IFNULL(mc.name, '') AS projectType, 
      IFNULL(mpt.title, '') AS category, 
      IFNULL(v.name, '') AS village, 
      IFNULL(u.first_name, '') as client_name
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    mst_category AS mc ON mc.id = nmf.project_type
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    village AS v ON v.id = nmf.village
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme
      left join users as u on u.id = nmf.client_id
       LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE 
      nmf.is_deleted = 0   and nmfpd.application_name = "interior_design" and nmf.client_id = ?`;

      console.log(sql);

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: [], error: true });
    }
  },

  fetchClientArchitecture: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
    nmf.id, 
IFNULL(nmf.case_id, '') AS case_id,
      IFNULL(nmf.project_name, '') AS project_name,
      IFNULL(nmf.authority, '') AS authority,
      IFNULL(tp.tpscheme, '') AS tpscheme,
      IFNULL(nmf.op_no, '') AS op_no,
      IFNULL(nmf.fp_no, '') AS fp_no,
      IFNULL(nmf.b_no, '') AS b_no,
      IFNULL(nmf.rs_no, '') AS rs_no,
      IFNULL(nmf.ward_no, '') AS ward_no,
      IFNULL(nmf.moje, '') AS moje,
      IFNULL(mpt.title, '') AS category,
      IFNULL(nmf.tentative_design, '') AS tentative_design,
      IFNULL(mc.name, '') AS projectType, 
      IFNULL(mpt.title, '') AS category, 
      IFNULL(v.name, '') AS village, 
      IFNULL(u.first_name, '') as client_name
FROM 
    new_mst_file AS nmf
LEFT JOIN 
    mst_category AS mc ON mc.id = nmf.project_type
LEFT JOIN 
    mst_project_type AS mpt ON mpt.id = nmf.category
LEFT JOIN 
    village AS v ON v.id = nmf.village
LEFT JOIN 
    tpscheme AS tp ON tp.id = nmf.tpscheme
      left join users as u on u.id = nmf.client_id
       LEFT JOIN 
    new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
      WHERE 
      nmf.is_deleted = 0  and nmfpd.application_name = "architecture_design" and nmf.client_id = ?`;

      console.log(sql);

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  clientlogin: (req, res) => {
    try {
      const { email, password } = req.body;

      req.assert("email", "Email or username required.").notEmpty();
      req.assert("password", "Password is required").notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        res.status(200).json({ message: errors[0].msg, error: true, data: {} });
      } else {
        var sql =
          "SELECT `mst_group_id`as role_id,`mst_groups`.`name` as `role`,`users`.`comp_id`,`users`.`id`,`users`.`password`,`users`.`active`,`users`.`first_name`,`users`.`last_name`,concat(`users`.`first_name`,' ',`users`.`last_name`) as `fullname`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture`,`users`.`isdeleted` FROM `users` LEFT JOIN `users_groups` ON `users_groups`.`mst_user_id`=`users`.`id` LEFT JOIN `mst_groups` ON `mst_groups`.`id`=`users_groups`.`mst_group_id` LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id` LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id` LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id` WHERE `users`.`email`='" +
          email +
          "' and `users`.`isdeleted`=0 and `mst_groups`.`name`='Client'";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length > 0) {
            const isPasswordCorrect = bcrypt.compareSync(
              password,
              result[0]?.password,
            );
            if (isPasswordCorrect) {
              if (parseInt(result[0]?.active) === 1) {
                const tokenData = {
                  id: result[0]?.id,
                  name: result[0]?.name,
                  role: result[0].role,
                  comp_id: result[0]?.comp_id,
                  user_roles: result.map((r) => r?.role),
                };

                const token = jwt.sign(tokenData, meta.thekey, {
                  expiresIn: "365d",
                });

                const data = {
                  user_id: tokenData.id,
                  role_id: result[0]?.role_id ? result[0].role_id : "",
                  user_roles:
                    tokenData.user_roles?.length > 0
                      ? tokenData.user_roles
                      : "",
                  image_path:
                    "https://webapp.zaidexceldesign.com/public/users/",
                  phone: result[0]?.phone ? result[0].phone : "",
                  first_name: result[0]?.first_name
                    ? result[0]?.first_name
                    : "",
                  last_name: result[0]?.last_name ? result[0]?.last_name : "",
                  fullname: result[0]?.fullname ? result[0]?.fullname : "",
                  email: result[0]?.email ? result[0]?.email : "",
                  username: result[0]?.username ? result[0]?.username : "",
                  profile_picture: result[0]?.profile_picture
                    ? result[0]?.profile_picture
                    : "",
                  token: token,
                };

                res
                  .status(200)
                  .json({ message: "Logged In", error: false, data: data });
              } else {
                res.status(200).json({
                  message: "Account is disabled",
                  error: true,
                  data: {},
                });
              }
            } else {
              res
                .status(200)
                .json({ message: "Invalid password", error: true, data: {} });
            }
          } else {
            res
              .status(200)
              .json({ message: "email doesn't exist", error: true, data: {} });
          }
        });
      }
    } catch (err) {
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },

  // post

  addPost: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const {
      date,
      name,
      type,
      platform_add,
      caption,
      hastag,
      thumbnail,
      post_file,
    } = this_data;

    const platformValue = Array.isArray(platform_add)
      ? platform_add.join(",")
      : platform_add;

    const sql = `
      INSERT INTO mst_post 
      (\`date\`, \`name\`, \`type\`, \`platform_add\`, \`caption\`, \`hastag\`, \`thumbnail\`, 
       \`status\`, \`created_by\`, \`created_at\`, \`updated_at\`, \`updated_by\`, \`is_deleted\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      date,
      name,
      type,
      platformValue,
      caption,
      hastag,
      thumbnail,
      0,
      user_id,
      getCurrentDateAndTime(),
      null,
      null,
      0,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      const post_id = result.insertId;
      let parsedFiles = [];
      try {
        if (typeof post_file === "string") {
          if (post_file.startsWith("[") && post_file.endsWith("]")) {
            parsedFiles = post_file
              .slice(1, -1)
              .split(",")
              .map((f) => f.trim());
          } else {
            parsedFiles = [post_file];
          }
        } else if (Array.isArray(post_file)) {
          parsedFiles = post_file;
        }
      } catch (e) {
        parsedFiles = post_file ? [post_file] : [];
      }

      if (parsedFiles && parsedFiles.length > 0) {
        const files = parsedFiles.map((file) => [post_id, file]);

        const sqlMulti = `
          INSERT INTO mst_type_post (post_id, post_file)
          VALUES ?
        `;

        db.query(sqlMulti, [files], (err3) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: {},
            });
          }

          return res.status(201).json({
            error: false,
            message: "Post has been added successfully with files.",
            data: { id: post_id },
          });
        });
      } else {
        return res.status(201).json({
          error: false,
          message: "Post has been added successfully (no files uploaded).",
          data: { id: post_id },
        });
      }
    });
  },

  fetchAdminpost: (req, res) => {
    try {
      var sql = `SELECT 
    mp.id, 
IFNULL(mp.name, '') AS name,
      IFNULL(mp.type, '') AS type,
      DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
      IFNULL(mp.platform_add, '') AS platform_add,
      IFNULL(mp.thumbnail, '') AS thumbnail,
      IFNULL(mp.caption, '') AS caption,
      IFNULL(mp.hastag, '') AS hastag,
      IFNULL(mp.status, '') AS status
FROM 
    mst_post AS mp
      WHERE 
      mp.is_deleted = 0 `;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let platform_add = [];
            try {
              platform_add = JSON.parse(row.platform_add);
            } catch (e) {
              platform_add = row.platform_add
                ? row.platform_add.split(",").map((s) => s.trim())
                : [];
            }

            // Normalize all values to strings
            platform_add = Array.isArray(platform_add)
              ? platform_add.map((s) => String(s))
              : [String(platform_add)];

            return {
              ...row,
              platform_add,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchpost: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
    mp.id, 
IFNULL(mp.name, '') AS name,
      IFNULL(mp.type, '') AS type,
      DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
      IFNULL(mp.platform_add, '') AS platform_add,
      IFNULL(mp.thumbnail, '') AS thumbnail,
      IFNULL(mp.caption, '') AS caption,
      IFNULL(mp.hastag, '') AS hastag,
      IFNULL(mp.status, '') AS status
FROM 
    mst_post AS mp
      WHERE 
      mp.is_deleted = 0  and mp.created_by = ?`;

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let platform_add = [];
            try {
              platform_add = JSON.parse(row.platform_add);
            } catch (e) {
              platform_add = row.platform_add
                ? row.platform_add.split(",").map((s) => s.trim())
                : [];
            }

            // Normalize all values to strings
            platform_add = Array.isArray(platform_add)
              ? platform_add.map((s) => String(s))
              : [String(platform_add)];

            return {
              ...row,
              platform_add,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },
  fetchpostbyid: (req, res) => {
    const id = parseInt(req.body.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    const sql = `
      SELECT 
        mp.id, 
        IFNULL(mp.name, '') AS name,
        IFNULL(mp.type, '') AS type,
        DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
        IFNULL(mp.platform_add, '') AS platform_add,
        IFNULL(mp.thumbnail, '') AS thumbnail,
        IFNULL(mp.caption, '') AS caption,
        IFNULL(mp.hastag, '') AS hastag,
        IFNULL(mp.status, '') AS status,
        IFNULL(mtp.id, '') AS mtp_id,
        IFNULL(mtp.post_file, '') AS post_file
      FROM mst_post AS mp
      LEFT JOIN mst_type_post AS mtp ON mtp.post_id = mp.id
      WHERE mp.is_deleted = 0 AND mp.id = ?;
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (!result.length) {
        return res
          .status(404)
          .json({ error: true, message: "No record found", data: [] });
      }

      let platform_add = [];
      try {
        platform_add = JSON.parse(result[0].platform_add);
      } catch (e) {
        platform_add = result[0].platform_add
          ? result[0].platform_add.split(",").map((s) => s.trim())
          : [];
      }

      // Normalize all values to strings
      platform_add = Array.isArray(platform_add)
        ? platform_add.map((s) => String(s))
        : [String(platform_add)];

      // Grouping logic
      const post = {
        id: result[0].id,
        name: result[0].name,
        type: result[0].type,
        date: result[0].date,
        platform_add,
        thumbnail: result[0].thumbnail,
        caption: result[0].caption,
        hastag: result[0].hastag,
        status: result[0].status,
        images: [],
      };

      result.forEach((row) => {
        if (row.mtp_id && row.post_file) {
          post.images.push({
            mtp_id: row.mtp_id,
            post_file: row.post_file,
          });
        }
      });

      res.status(200).json({
        error: false,
        message: "Record fetched successfully",
        data: [post],
      });
    });
  },

  // fetchpostbyid: (req, res) => {
  //   const id = parseInt(req.body.id);

  //   if (!id) {
  //     return res
  //       .status(400)
  //       .json({ error: true, message: "Id is required", data: {} });
  //   }

  //   const sql = `
  //     SELECT
  //       mp.id,
  //       IFNULL(mp.name, '') AS name,
  //       IFNULL(mp.type, '') AS type,
  //       DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
  //       IFNULL(mp.platform_add, '') AS platform_add,
  //       IFNULL(mp.thumbnail, '') AS thumbnail,
  //       IFNULL(mp.caption, '') AS caption,
  //       IFNULL(mp.hastag, '') AS hastag,
  //       IFNULL(mp.status, '') AS status,
  //       IFNULL(mtp.id, '') AS mtp_id,
  //       IFNULL(mtp.post_file, '') AS post_file
  //     FROM mst_post AS mp
  //     LEFT JOIN mst_type_post AS mtp ON mtp.post_id = mp.id
  //     WHERE mp.is_deleted = 0 AND mp.id = ?;
  //   `;

  //   db.query(sql, [id], (err, result) => {
  //     if (err) {
  //       return res
  //         .status(500)
  //         .json({ error: true, message: err.sqlMessage, data: [] });
  //     }

  //     if (!result.length) {
  //       return res
  //         .status(404)
  //         .json({ error: true, message: "No record found", data: [] });
  //     }
  //     let platform_add = [];
  //     try {
  //       platform_add = JSON.parse(result[0].platform_add);
  //     } catch (e) {
  //       platform_add = result[0].platform_add ? [result[0].platform_add] : [];
  //     }

  //     // Grouping logic
  //     const post = {
  //       id: result[0].id,
  //       name: result[0].name,
  //       type: result[0].type,
  //       date: result[0].date,
  //       platform_add,
  //       thumbnail: result[0].thumbnail,
  //       caption: result[0].caption,
  //       hastag: result[0].hastag,
  //       status: result[0].status,
  //       images: [],
  //     };

  //     result.forEach((row) => {
  //       if (row.mtp_id && row.post_file) {
  //         post.images.push({
  //           mtp_id: row.mtp_id,
  //           post_file: row.post_file,
  //         });
  //       }
  //     });

  //     res.status(200).json({
  //       error: false,
  //       message: "Record fetched successfully",
  //       data: [post],
  //     });
  //   });
  // },

  uploadpost: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: true,
        message: "Please upload at least one file.",
        data: {},
      });
    }

    let post_files = [];
    let thumbnail = "";

    req.files.forEach((file) => {
      if (file.fieldname === "post_file") {
        post_files.push(getImageWithFoldername(file.path));
      } else if (file.fieldname === "thumbnail") {
        thumbnail = getImageWithFoldername(file.path);
      } else {
        unlinkImage(file.path);
      }
    });

    const data = {
      error: false,
      message: "Images uploaded successfully.",
      data: {
        post_file: post_files,
        thumbnail: thumbnail,
      },
    };

    return res.status(201).json(data);
  },

  deletePost: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_post` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  updatePost: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const {
      id, // post ID to update
      date,
      name,
      type,
      platform_add,
      caption,
      hastag,
      thumbnail,
      post_file, // optional array or string of new files
    } = this_data;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Post ID is required for update.",
        data: {},
      });
    }

    // Convert platform_add → JSON string for consistency
    const platformValue = Array.isArray(platform_add)
      ? JSON.stringify(platform_add)
      : platform_add;

    // SQL to update main post
    const sql = `
      UPDATE mst_post
      SET 
        date = ?, 
        name = ?, 
        type = ?, 
        platform_add = ?, 
        caption = ?, 
        hastag = ?, 
        thumbnail = ?, 
        updated_by = ?, 
        updated_at = ? 
      WHERE id = ? AND is_deleted = 0
    `;

    const values = [
      date,
      name,
      type,
      platformValue,
      caption,
      hastag,
      thumbnail,
      user_id,
      getCurrentDateAndTime(),
      id,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: true,
          message: "No post found or already deleted.",
          data: {},
        });
      }

      // Parse post_file safely
      let parsedFiles = [];
      try {
        if (typeof post_file === "string") {
          if (post_file.startsWith("[") && post_file.endsWith("]")) {
            // Remove brackets and quotes if needed
            parsedFiles = post_file
              .slice(1, -1)
              .split(",")
              .map((f) => f.trim().replace(/^"(.*)"$/, "$1")); // remove quotes if present
          } else {
            parsedFiles = [post_file];
          }
        } else if (Array.isArray(post_file)) {
          parsedFiles = post_file;
        }
      } catch (e) {
        parsedFiles = post_file ? [post_file] : [];
      }

      if (parsedFiles && parsedFiles.length > 0) {
        // Delete old files
        const deleteSql = `DELETE FROM mst_type_post WHERE post_id = ?`;
        db.query(deleteSql, [id], (delErr) => {
          if (delErr) {
            return res.status(500).json({
              error: true,
              message: delErr.sqlMessage,
              data: {},
            });
          }

          // Insert new files
          const files = parsedFiles.map((file) => [id, file]);
          const sqlMulti = `
            INSERT INTO mst_type_post (post_id, post_file)
            VALUES ?
          `;

          db.query(sqlMulti, [files], (err3) => {
            if (err3) {
              return res.status(500).json({
                error: true,
                message: err3.sqlMessage,
                data: {},
              });
            }

            return res.status(200).json({
              error: false,
              message: "Post updated successfully with new files.",
              data: { id },
            });
          });
        });
      } else {
        // No file updates
        return res.status(200).json({
          error: false,
          message: "Post updated successfully (no file changes).",
          data: { id },
        });
      }
    });
  },

  // campaign
  // AddCampaign: (req, res) => {
  //   const user_id = req?.user ? req?.user?.id : null;
  //   const this_data = req?.body;

  //   const campaign = {
  //     name: this_data.name,
  //     budget: this_data.budget,
  //     budget_type: this_data.budget_type,
  //     post_id: this_data.post_id,
  //     description: this_data.description,
  //     start_date: this_data.start_date,
  //     end_date: this_data.end_date,
  //     start_time: this_data.start_time,
  //     end_time: this_data.end_time,
  //     campaign_platform: Array.isArray(this_data.campaign_platform)
  //       ? this_data.campaign_platform.join(",")
  //       : this_data.campaign_platform,
  //       target_people: this_data.target_people,
  //       target_location: this_data.target_location,
  //       screenshot: this_data.screenshot,
  //     created_by: user_id,
  //     created_at: getCurrentDateAndTime(),
  //     updated_at: null,
  //     updated_by: null,
  //     is_deleted: 0,
  //   };

  //   db.query("INSERT INTO mst_campaign SET ?", campaign, function (err, result) {
  //     if (err) {
  //       console.error("Database error:", err.sqlMessage);
  //       return res
  //         .status(500)
  //         .json({ error: true, message: err.sqlMessage, data: {} });
  //     }

  //     res.status(201).json({
  //       error: false,
  //       message: "Campaign has been added successfully",
  //     });
  //   });
  // },

  AddOrUpdateCampaign: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const {
      id,
      name,
      budget,
      budget_type,
      post_id,
      description,
      start_date,
      end_date,
      start_time,
      end_time,
      campaign_platform,
      target_people,
      target_location,
      screenshot,
    } = this_data;

    const platformValue = Array.isArray(campaign_platform)
      ? campaign_platform.join(",")
      : campaign_platform;

    if (id) {
      const updateSql = `
        UPDATE mst_campaign
        SET 
          name = ?, 
          budget = ?, 
          budget_type = ?, 
          post_id = ?, 
          description = ?, 
          start_date = ?, 
          end_date = ?, 
          start_time = ?, 
          end_time = ?, 
          campaign_platform = ?, 
          target_people = ?, 
          target_location = ?, 
          screenshot = ?, 
          updated_by = ?, 
          updated_at = ?
        WHERE id = ? AND is_deleted = 0
      `;

      const updateValues = [
        name,
        budget,
        budget_type,
        post_id,
        description,
        start_date,
        end_date,
        start_time,
        end_time,
        platformValue,
        target_people,
        target_location,
        screenshot,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Campaign not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Campaign updated successfully",
          data: { id },
        });
      });
    } else {
      const campaign = {
        name,
        budget,
        budget_type,
        post_id,
        description,
        start_date,
        end_date,
        start_time,
        end_time,
        campaign_platform: platformValue,
        target_people,
        target_location,
        screenshot,
        status: 0,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_campaign SET ?", campaign, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Campaign created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  uploadCampaign: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    const files = [];
    let screenshot = "";

    req.files.forEach((file) => {
      if (file.fieldname === "screenshot") {
        screenshot = getImageWithFoldername(file.path);
        files.push(screenshot);
      } else {
        unlinkImage(file.path);
      }
    });

    if (!screenshot) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the screenshot",
        data: {},
      });
    }

    const site = {
      screenshot: screenshot,
    };
    const data = {
      error: false,
      message: "upload image successfully.",
      data: screenshot,
    };
    res.status(201).json(data);
  },

  fetchAdmincampaign: (req, res) => {
    try {
      var sql = `SELECT 
      mc.id, 
      IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
IFNULL(DATE_FORMAT(mc.start_date, '%Y-%m-%d'), '') AS start_date,
IFNULL(DATE_FORMAT(mc.end_date, '%Y-%m-%d'), '') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
      mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0 `;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];

            try {
              const parsed = JSON.parse(row.campaign_platform);
              if (Array.isArray(parsed)) {
                campaign_platform = parsed.map((v) => String(v));
              } else if (typeof parsed === "string") {
                campaign_platform = parsed.split(",").map((v) => v.trim());
              }
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? row.campaign_platform.split(",").map((v) => v.trim())
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchcampaign: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
      mc.id, 
      IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
     IFNULL(DATE_FORMAT(mc.start_date, '%Y-%m-%d'), '') AS start_date,
IFNULL(DATE_FORMAT(mc.end_date, '%Y-%m-%d'), '') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
      mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0  and mc.created_by = ?`;

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];

            try {
              const parsed = JSON.parse(row.campaign_platform);
              if (Array.isArray(parsed)) {
                campaign_platform = parsed.map((v) => String(v));
              } else if (typeof parsed === "string") {
                campaign_platform = parsed.split(",").map((v) => v.trim());
              }
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? row.campaign_platform.split(",").map((v) => v.trim())
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchcampaignbyid: (req, res) => {
    const id = parseInt(req.body.id);
    try {
      var sql = `SELECT 
    mc.id, 
IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
       DATE_FORMAT(mc.start_date, '%Y-%m-%d') AS start_date,
     DATE_FORMAT(mc.end_date, '%Y-%m-%d') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
    mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0 AND mc.id=?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];

            try {
              const parsed = JSON.parse(row.campaign_platform);
              if (Array.isArray(parsed)) {
                campaign_platform = parsed.map((v) => String(v));
              } else if (typeof parsed === "string") {
                campaign_platform = parsed.split(",").map((v) => v.trim());
              }
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? row.campaign_platform.split(",").map((v) => v.trim())
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  // fetchmobileCalenderCampaign : (req, res) => {
  //   try {
  //     // Input date from body
  //     const dateInput = req.body?.month || ""; // e.g. "2025-11-05"

  //     // Extract date, month, and year separately using moment
  //     const year = moment(dateInput, "YYYY-MM-DD").format("YYYY");
  //     const month = moment(dateInput, "YYYY-MM-DD").format("MM");
  //     const date = moment(dateInput, "YYYY-MM-DD").format("DD");

  //     // ✅ Main SQL Query — unique records, no duplicates
  //     const sql = `
  //       SELECT
  //           mc.id,
  //           IFNULL(mc.name, '') AS name,
  //           IFNULL(mc.budget, '') AS budget,
  //           IFNULL(mc.budget_type, '') AS budget_type,
  //           IFNULL(mc.post_id, '') AS post_id,
  //           IFNULL(mc.description, '') AS description,
  //           DATE_FORMAT(mc.start_date, '%Y-%m-%d') AS start_date,
  //           DATE_FORMAT(mc.end_date, '%Y-%m-%d') AS end_date,
  //           IFNULL(mc.start_time, '') AS start_time,
  //           IFNULL(mc.end_time, '') AS end_time,
  //           IFNULL(mc.campaign_platform, '') AS campaign_platform,
  //           IFNULL(mc.target_people, '') AS target_people,
  //           IFNULL(mc.target_location, '') AS target_location,
  //           IFNULL(mc.screenshot, '') AS screenshot
  //       FROM mst_campaign AS mc
  //       WHERE mc.is_deleted = 0
  //         AND ? BETWEEN mc.start_date AND mc.end_date
  //       GROUP BY mc.id
  //       ORDER BY mc.start_date ASC
  //     `;

  //     // ✅ Query database — only send dateInput once since BETWEEN handles date range
  //     db.query(sql, [dateInput], (err, result) => {
  //       if (err) {
  //         console.error("SQL Error:", err);
  //         return res.status(500).json({
  //           error: true,
  //           message: err.sqlMessage,
  //           data: [],
  //         });
  //       }

  //       // ✅ If no results
  //       if (!result || result.length === 0) {
  //         return res.status(200).json({
  //           error: false,
  //           message: "No campaigns found for the selected date",
  //           data: [],
  //         });
  //       }

  //       // ✅ Success response
  //       return res.status(200).json({
  //         error: false,
  //         message: "Campaign records fetched successfully",
  //         data: result,
  //       });
  //     });
  //   } catch (error) {
  //     console.error("Catch Error:", error);
  //     res.status(500).json({
  //       error: true,
  //       message: error.message || "Internal Server Error",
  //       data: [],
  //     });
  //   }
  // },

  fetchmobileCalenderCampaign: (req, res) => {
    const dateInput = req.body?.month || "";

    const year = moment(dateInput, "YYYY-MM-DD").format("YYYY");
    const month = moment(dateInput, "YYYY-MM-DD").format("MM");
    // const date = moment(dateInput, "YYYY-MM-DD").format("DD");

    const sql = `
  SELECT 
      mc.id, 
      IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
      DATE_FORMAT(mc.start_date, '%Y-%m-%d') AS start_date,
      DATE_FORMAT(mc.end_date, '%Y-%m-%d') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
      mst_campaign AS mc
    WHERE mc.is_deleted = 0 
      AND MONTH(mc.start_date) = ? 
      AND YEAR(mc.start_date) = ?
    GROUP BY mc.id
  `;

    // Helper function to expand dates
    const expandDateRange = (record) => {
      const from = moment(record.start_date);
      const to = moment(record.end_date);
      const expanded = [];

      for (
        let date = moment(from);
        date.isSameOrBefore(to);
        date.add(1, "days")
      ) {
        expanded.push({
          ...record,
          date: date.format("YYYY-MM-DD"), // new field for each day
        });
      }

      return expanded;
    };

    db.query(sql, [month, year], (err, result) => {
      if (err) {
        res.status(500).json({
          // error: total_uncompleted_prevdate_tasks,
          message: err.sqlMessage,
          data: [],
        });
      } else if (result.length > 0) {
        let expandedResults = [];
        result.forEach((record) => {
          expandedResults = expandedResults.concat(expandDateRange(record));
        });

        res.status(200).json({
          error: false,
          message: "Record fetched",
          data: expandedResults,
        });
      } else {
        res.status(200).json({
          error: false,
          message: "Requested record not found",
          data: [],
        });
      }
    });
  },

  deleteCampaign: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_campaign` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  // Leads

  AddOrUpdateLeads: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const {
      id,
      name,
      mobile_no,
      email,
      description,
      address,
      source,
      service,
    } = this_data;

    const serviceValue = Array.isArray(service) ? service.join(",") : service;

    if (id) {
      const updateSql = `
        UPDATE mst_leads
        SET
          name = ?,
          mobile_no = ?,
          email = ?,
          description = ?,
          address = ?,
          source = ?,
          service = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ? AND is_deleted = 0
      `;

      const updateValues = [
        name,
        mobile_no,
        email,
        description,
        address,
        source,
        serviceValue,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Lead not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Lead updated successfully",
          data: { id },
        });
      });
    } else {
      // INSERT new lead
      const lead = {
        name,
        mobile_no,
        email,
        description,
        address,
        source,
        service: serviceValue,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_leads SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Lead created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchleads: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
      ml.id, 
      IFNULL(ml.name, '') AS name,
      IFNULL(ml.mobile_no, '') AS mobile_no,
      IFNULL(ml.email, '') AS email,
      IFNULL(ml.service, '') AS service,
      IFNULL(ml.description, '') AS description,
      IFNULL(ml.address, '') AS address,
      IFNULL(ml.source, '') AS source
      FROM 
      mst_leads AS ml
      WHERE 
      ml.is_deleted = 0 `;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let service = [];
            try {
              service = JSON.parse(row.service);
            } catch (e) {
              service = row.service ? [row.service] : [];
            }

            return {
              ...row,
              service,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchleadsbyid: (req, res) => {
    const id = parseInt(req.body.id);
    try {
      var sql = `SELECT 
      ml.id, 
      IFNULL(ml.name, '') AS name,
      DATE_FORMAT(ml.created_at, '%Y-%m-%d') AS date,
      IFNULL(ml.mobile_no, '') AS mobile_no,
      IFNULL(ml.email, '') AS email,
      IFNULL(ml.service, '') AS service,
      IFNULL(ml.description, '') AS description,
      IFNULL(ml.address, '') AS address,
      IFNULL(ml.source, '') AS source
      FROM 
      mst_leads AS ml
      WHERE 
      ml.is_deleted = 0  AND ml.id=?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let service = [];
            try {
              service = JSON.parse(row.service);
            } catch (e) {
              service = row.service ? [row.service] : [];
            }

            return {
              ...row,
              service,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },
  deleteLeads: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_leads` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  // Follow ups

  AddOrUpdateFollowups: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, next_date, lead_id, assign_person, talk } = this_data;

    if (id) {
      const updateSql = `
        UPDATE mst_follow_ups
        SET
          next_date = ?,
          lead_id=?,
          assign_person = ?,
          talk = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ? AND is_deleted = 0
      `;

      const updateValues = [
        next_date,
        lead_id,
        assign_person,
        talk,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Follow ups not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Follow ups updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        date: getCurrentDateAndTime(),
        next_date,
        lead_id,
        assign_person,
        talk,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_follow_ups SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Follow ups  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchFollowups: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;

    try {
      var sql = `SELECT 
      mfu.id, 
      mfu.lead_id,
      DATE_FORMAT(mfu.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(mfu.next_date, '%Y-%m-%d') AS next_date,
      IFNULL(u.first_name, '') AS assign_person_name,
        IFNULL(mfu.assign_person, '') AS assign_person,
      IFNULL(mfu.talk, '') AS talk
      FROM 
      mst_follow_ups AS mfu
      left join users as u
      on u.id = mfu.assign_person
      WHERE 
      mfu.is_deleted = 0  and mfu.created_by = ? and mfu.lead_id= ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteFollowups: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_follow_ups` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  // question
  AddOrUpdateQuestion: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, heading, lead_id, answer } = this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_question
      SET
        heading = ?,
        lead_id=?,
        answer = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        heading,
        lead_id,
        answer,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Question not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Question updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        heading,
        lead_id,
        answer,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_question SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Question  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchQuestion: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    mq.id, 
    mq.lead_id,
    IFNULL(mq.heading, '') AS heading,
    IFNULL(mq.answer, '') AS answer
    FROM 
    mst_question AS mq
    WHERE 
    mq.is_deleted = 0  and mq.created_by = ? and mq.lead_id= ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteQuestion: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_question` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  // meeting

  AddOrUpdateMeeting: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, date, lead_id, heading, discussion, assign_person } = this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_leads_meeting
      SET
      date = ?,
      lead_id=?,
        heading = ?,
        discussion = ?,
        assign_person=?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        date,
        lead_id,
        heading,
        discussion,
        assign_person,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Meeting not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Meeting updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        date,
        lead_id,
        heading,
        discussion,
        assign_person,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_leads_meeting SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Meeting  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchMeeting: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    mlm.id, 
     DATE_FORMAT(mlm.date, '%Y-%m-%d') AS date,
    IFNULL(mlm.heading, '') AS heading,
    IFNULL(mlm.discussion, '') AS discussion,
     IFNULL(mlm.assign_person, '') AS assign_person,
      IFNULL(u.first_name, '') AS assign_person_name
    FROM 
    mst_leads_meeting AS mlm
    left join users as u
      on u.id = mlm.assign_person
    WHERE 
    mlm.is_deleted = 0  and mlm.created_by = ? and mlm.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteMeeting: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_leads_meeting` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  // site visit

  AddOrUpdateSitevisit: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, date, lead_id, image, visitor, site_visit_for, observation } =
      this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_site_visit
      SET
      date = ?,
      lead_id=?,
       image = ?,
        visitor = ?,
        site_visit_for = ?,
        observation = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        date,
        lead_id,
        image,
        visitor,
        site_visit_for,
        observation,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Site Visit not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Site Visit updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        date,
        lead_id,
        image,
        visitor,
        site_visit_for,
        observation,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_site_visit SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Site Visit  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },
  fetchSitevisit: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    msv.id, 
     DATE_FORMAT(msv.date, '%Y-%m-%d') AS date,
    IFNULL(msv.image, '') AS image,
    IFNULL(msv.visitor, '') AS visitor,
        IFNULL(u.first_name, '') AS visitor_name,
      IFNULL(msv.site_visit_for, '') AS site_visit_for,
        IFNULL(msv.observation, '') AS observation
    FROM 
    mst_site_visit AS msv
    left join users as u
      on u.id = msv.visitor
    WHERE 
    msv.is_deleted = 0  and msv.created_by = ? and msv.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteSitevisit: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_site_visit` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  uploadSitevist: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    const files = [];
    let images = "";

    req.files.forEach((file) => {
      if (file.fieldname === "images") {
        images = getImageWithFoldername(file.path);
        files.push(images);
      } else {
        unlinkImage(file.path);
      }
    });

    if (!images) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the images",
        data: {},
      });
    }

    const site = {
      images: images,
    };
    const data = {
      error: false,
      message: "upload image successfully.",
      data: images,
    };
    res.status(201).json(data);
  },

  // proposal

  AddOrUpdateproposal: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, lead_id, proposal, scope_of_work, status } = this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_proposal
      SET
      proposal = ?,
      lead_id=?,
       scope_of_work = ?,
        status = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        proposal,
        lead_id,
        scope_of_work,
        status,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Proposal not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Proposal updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        proposal,
        lead_id,
        scope_of_work,
        status,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_proposal SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Proposal  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },
  fetchproposal: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    mp.id, 
    IFNULL(mp.proposal, '') AS proposal,
    IFNULL(mp.scope_of_work, '') AS scope_of_work,
      IFNULL(mp.status, '') AS status
    FROM 
    mst_proposal AS mp
    WHERE 
    mp.is_deleted = 0  and mp.created_by = ? and mp.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteProposal: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_proposal` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  uploadproposal: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    const files = [];
    let proposal = "";

    req.files.forEach((file) => {
      if (file.fieldname === "proposal") {
        proposal = getImageWithFoldername(file.path);
        files.push(proposal);
      } else {
        unlinkImage(file.path);
      }
    });

    if (!proposal) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the proposal",
        data: {},
      });
    }

    const site = {
      proposal: proposal,
    };
    const data = {
      error: false,
      message: "upload image successfully.",
      data: proposal,
    };
    res.status(201).json(data);
  },

  // presentation
  AddOrUpdatepresentation: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, lead_id, presentation, presented_by, summary, feedback, date } =
      this_data;

    if (id) {
      const updateSql = `
      UPDATE presentation
      SET
      presentation = ?,
      lead_id=?,
       presented_by = ?,
        summary = ?,
          feedback = ?,
            date = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        presentation,
        lead_id,
        presented_by,
        summary,
        feedback,
        date,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "presentation not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "presentation updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        presentation,
        lead_id,
        presented_by,
        summary,
        feedback,
        date,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO presentation SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "presentation  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },
  fetchpresentation: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    p.id, 
    IFNULL(p.presentation, '') AS presentation,
    IFNULL(p.presented_by, '') AS presented_by,
       IFNULL(u.first_name, '') AS presented_name,
     DATE_FORMAT(p.date, '%Y-%m-%d') AS date,
      IFNULL(p.summary, '') AS summary,
      IFNULL(p.feedback, '') AS feedback
    FROM 
    presentation AS p
    left join users as u
      on u.id = p.presented_by
    WHERE 
    p.is_deleted = 0  and p.created_by = ? and p.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deletepresentation: (req, res) => {
    const id = req?.body?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `presentation` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  uploadpresentation: function (req, res) {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    const files = [];
    let presentation = "";

    req.files.forEach((file) => {
      if (file.fieldname === "presentation") {
        presentation = getImageWithFoldername(file.path);
        files.push(presentation);
      } else {
        unlinkImage(file.path);
      }
    });

    if (!presentation) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the presentation",
        data: {},
      });
    }

    const site = {
      presentation: presentation,
    };
    const data = {
      error: false,
      message: "upload image successfully.",
      data: presentation,
    };
    res.status(201).json(data);
  },

  // term n condition

  AddOrUpdateTerms: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, terms, status, lead_id } = this_data;

    if (id) {
      const updateSql = `
      UPDATE terms_n_condition
      SET
      terms = ?,
      lead_id=?,
        status = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        terms,
        lead_id,
        status,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Terms not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Terms updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        terms,
        lead_id,
        status,
        date: getCurrentDateAndTime(),
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO terms_n_condition SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Terms  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },
  fetchterms: (req, res) => {
    const { lead_id } = req.body;
    try {
      var sql = `SELECT 
    tnc.id, 
    IFNULL(tnc.terms, '') AS terms,
       DATE_FORMAT(tnc.date, '%Y-%m-%d') AS date,
      IFNULL(tnc.status, '') AS status
    FROM 
    terms_n_condition AS tnc
    WHERE 
    tnc.is_deleted = 0 and tnc.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  getdepartmentshowbymobileuserid: (req, res) => {
    try {
      const user_id = req.user ? req.user.id : null;

      var sql = `SELECT md.id,md.name FROM users as u
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

  generateMobileOperatingMeeting: async function (req, res) {
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

  generateMobileTacticalMeeting: async function (req, res) {
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
            .json({ error: true, message: err.sqlMessage, data: [] });
        }
        if (existingMeeting.length > 0) {
          const lastMeetingDate = moment(existingMeeting[0].date, "YYYY-MM-DD");
          const today = moment();

          const isSameDay = today.isSame(lastMeetingDate, "day");

          if (isSameDay) {
            return res.status(400).json({
              error: true,
              message: `Meeting has already been generated today.`,
              data: [],
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

  generateMobileStrategicMeeting: async function (req, res) {
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
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (existingMeeting.length > 0) {
          const lastMeetingDate = moment(existingMeeting[0].date, "YYYY-MM-DD");
          const today = moment();

          const isSameDay = today.isSame(lastMeetingDate, "day");

          if (isSameDay) {
            return res.status(400).json({
              error: true,
              message: `Meeting has already been generated today.`,
              data: [],
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

  getTaskFiledata: (req, res) => {
    try {
      const id = req.body?.id;

      if (parseInt(id) != NaN) {
        var sql = ` SELECT nmf.id, nmf.company_name,nmf.address,nmf.lat,nmf.long,nmf.google_location,mpt.title as category_type,mc.name as project_type,nmf.fp_no,nmf.ward_no,tp.tpscheme,nmf.cs_no,nmf.b_no,nmf.op_no,nmf.rs_no
          FROM new_mst_file AS nmf
          LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
           left join mst_category as mc on mc.id = nmf.project_type
           left join tpscheme as tp on tp.id = nmf.tpscheme
          WHERE  nmf.is_deleted = 0 and nmf.id =?`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: [] });
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
  GetProjectPrice: (req, res) => {
    try {
      const id = req.body?.id;

      if (!isNaN(id)) {
        var sql = `SELECT CAST(id AS CHAR) AS id, application_name, IFNULL(price, '') AS price FROM new_mst_file_project_details WHERE is_deleted = 0 and project_id = ?`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: [] });
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

  UpdateProjectPrice: (req, res) => {
    try {
      const items = req.body;

      // Validate: must be a non-empty array
      if (!Array.isArray(items) || items.length === 0) {
        return res
          .status(200)
          .json({ message: "Invalid request", error: true, data: [] });
      }

      // Validate each item in the array
      for (const item of items) {
        if (!item.id || isNaN(item.id)) {
          return res
            .status(200)
            .json({ message: `Invalid id: ${item.id}`, error: true, data: [] });
        }
        if (
          item.price === undefined ||
          item.price === null ||
          String(item.price).trim() === ""
        ) {
          return res.status(200).json({
            message: `Price is required for id: ${item.id}`,
            error: true,
            data: [],
          });
        }
      }

      // Build bulk UPDATE using CASE WHEN
      const ids = items.map((item) => item.id);

      const caseClause = items.map(() => `WHEN id = ? THEN ?`).join(" ");

      const caseValues = items.flatMap((item) => [item.id, item.price]);

      const placeholders = ids.map(() => "?").join(", ");

      const sql = `
      UPDATE new_mst_file_project_details
      SET price = CASE ${caseClause} ELSE price END
      WHERE is_deleted = 0 AND id IN (${placeholders})
    `;

      const values = [...caseValues, ...ids];

      db.query(sql, values, (err, result) => {
        if (err) {
          return res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: [] });
        }

        if (result.affectedRows > 0) {
          return res.status(200).json({
            message: ` updated successfully`,
            error: false,
            // data: items,
          });
        } else {
          return res.status(200).json({
            message: "No records found to update",
            error: false,
            data: [],
          });
        }
      });
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: [] });
    }
  },

  getEscrowMobileMonthlyReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      MONTH(date) AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
    FROM (
      SELECT date, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT date, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS combined
    GROUP BY MONTH(date)
    ORDER BY MONTH(date)
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      const MONTH_NAMES = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const months = Array.from({ length: 12 }, (_, i) => {
        const found = rows.find((r) => r.month === i + 1);
        const income = parseFloat(found?.income || 0);
        const expense = parseFloat(found?.expense || 0);
        const profit = income - expense;
        return {
          month: i + 1,
          month_name: MONTH_NAMES[i],
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: months.reduce((s, m) => s + m.income, 0),
        expense: months.reduce((s, m) => s + m.expense, 0),
        profit: months.reduce((s, m) => s + m.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Report fetched successfully.",
        data: [{ year: selectedYear, months, totals }],
      });
    });
  },

  getEscrowMobileProjectReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      p.id AS project_id,
      p.case_id,
      CONCAT(u.first_name) AS client_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT project_id, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT project_id, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN new_mst_file AS p ON p.id = t.project_id
    LEFT JOIN users   AS u ON u.id = p.client_id
    GROUP BY p.id, p.case_id, client_name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });

      const projects = rows.map((r) => {
        const income = parseFloat(r.income || 0);
        const expense = parseFloat(r.expense || 0);
        const profit = income - expense;
        return {
          ...r,
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: projects.reduce((s, p) => s + p.income, 0),
        expense: projects.reduce((s, p) => s + p.expense, 0),
        profit: projects.reduce((s, p) => s + p.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Project report fetched.",
        data: [{ year: selectedYear, projects, totals }],
      });
    });
  },

  getEscrowMobileLedgerReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      lm.id   AS ledger_id,
      lm.name AS ledger_name,
      lg.name AS group_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT  NULL AS ledger_group_id, amount, 'income'  AS type FROM escrow_income         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT ledger_group_id, amount, 'expense' AS type FROM escrow_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN ledger_master AS lm ON lm.id = t.ledger_group_id
    LEFT JOIN ledger_group AS lg ON lg.id = lm.ledger_group_id
    GROUP BY lm.id, lm.name, lg.name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });

      const ledgers = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      const totals = {
        income: ledgers.reduce((s, p) => s + p.income, 0),
        expense: ledgers.reduce((s, p) => s + p.expense, 0),
        profit: ledgers.reduce((s, p) => s + p.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Ledger report fetched.",
        data: [{ year: selectedYear, ledgers, totals }],
      });
    });
  },

  getEscrowMobileMonthlyReportDetail: function (req, res) {
    const { month, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND MONTH(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE YEAR(p.date) = ? AND MONTH(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, selectedMonth, selectedYear, selectedMonth],
      (err, rows) => {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );
        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              year: selectedYear,
              month: selectedMonth,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getEscrowMobileProjectReportDetail: function (req, res) {
    const { project_id, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r
    
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.project_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.project_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [project_id, selectedYear, project_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );
        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";
        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              project_id: parseInt(project_id),
              year: selectedYear,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getEscrowMobileLedgerReportDetail: function (req, res) {
    const { ledger_id, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
          r.mode,    NULL AS ledger_name,  
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM escrow_income r

    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM escrow_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.ledger_group_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, ledger_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
          services: r.services || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );
        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";

        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              ledger_id: parseInt(ledger_id),
              year: selectedYear,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getMobileMonthlyReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      MONTH(date) AS month,
      SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
    FROM (
      SELECT date, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT date, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS combined
    GROUP BY MONTH(date)
    ORDER BY MONTH(date)
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      const MONTH_NAMES = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const months = Array.from({ length: 12 }, (_, i) => {
        const found = rows.find((r) => r.month === i + 1);
        const income = parseFloat(found?.income || 0);
        const expense = parseFloat(found?.expense || 0);
        const profit = income - expense;
        return {
          month: i + 1,
          month_name: MONTH_NAMES[i],
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: months.reduce((s, m) => s + m.income, 0),
        expense: months.reduce((s, m) => s + m.expense, 0),
        profit: months.reduce((s, m) => s + m.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Report fetched successfully.",
        data: [{ year: selectedYear, months, totals }],
      });
    });
  },

  // Project Report
  getMobileProjectReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      p.id AS project_id,
      p.case_id,
      CONCAT(u.first_name) AS client_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT project_id, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT project_id, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN new_mst_file AS p ON p.id = t.project_id
    LEFT JOIN users   AS u ON u.id = p.client_id
    GROUP BY p.id, p.case_id, client_name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });

      const projects = rows.map((r) => {
        const income = parseFloat(r.income || 0);
        const expense = parseFloat(r.expense || 0);
        const profit = income - expense;
        return {
          ...r,
          income,
          expense,
          profit,
          status: profit > 0 ? "profit" : profit < 0 ? "loss" : "breakeven",
        };
      });

      const totals = {
        income: projects.reduce((s, p) => s + p.income, 0),
        expense: projects.reduce((s, p) => s + p.expense, 0),
        profit: projects.reduce((s, p) => s + p.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Project report fetched.",
        data: [{ year: selectedYear, projects, totals }],
      });
    });
  },

  // Ledger Report
  getMobileLedgerReport: function (req, res) {
    const { year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT
      lm.id   AS ledger_id,
      lm.name AS ledger_name,
      lg.name AS group_name,
      SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END) AS income,
      SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense
    FROM (
      SELECT ledger_group_id, amount, 'income'  AS type FROM receipts         WHERE YEAR(date) = ? AND is_deleted = 0
      UNION ALL
      SELECT ledger_group_id, amount, 'expense' AS type FROM payments_expense WHERE YEAR(date) = ? AND is_deleted = 0
    ) AS t
    JOIN ledger_master AS lm ON lm.id = t.ledger_group_id
    LEFT JOIN ledger_group AS lg ON lg.id = lm.ledger_group_id
    GROUP BY lm.id, lm.name, lg.name
    ORDER BY income DESC
  `;

    db.query(sql, [selectedYear, selectedYear], function (err, rows) {
      if (err)
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });

      const ledgers = rows.map((r) => ({
        ...r,
        income: parseFloat(r.income || 0),
        expense: parseFloat(r.expense || 0),
        profit: parseFloat(r.income || 0) - parseFloat(r.expense || 0),
      }));

      const totals = {
        income: ledgers.reduce((s, p) => s + p.income, 0),
        expense: ledgers.reduce((s, p) => s + p.expense, 0),
        profit: ledgers.reduce((s, p) => s + p.profit, 0),
      };

      return res.status(200).json({
        error: false,
        message: "Ledger report fetched.",
        data: [{ year: selectedYear, ledgers, totals }],
      });
    });
  },

  // Project detail
  getMobileProjectReportDetail: function (req, res) {
    const { project_id, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.project_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.project_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [project_id, selectedYear, project_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );

        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";

        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              project_id: parseInt(project_id),
              year: selectedYear,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getMobileLedgerReportDetail: function (req, res) {
    const { ledger_id, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE r.ledger_group_id = ? AND YEAR(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE p.ledger_group_id = ? AND YEAR(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [ledger_id, selectedYear, ledger_id, selectedYear],
      function (err, rows) {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
          services: r.services || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );
        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";

        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              ledger_id: parseInt(ledger_id),
              year: selectedYear,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getMobileMonthlyReportDetail: function (req, res) {
    const { month, year } = req.body;
    const selectedYear = parseInt(year) || new Date().getFullYear();
    const selectedMonth = parseInt(month) || new Date().getMonth() + 1;

    const sql = `
    SELECT DATE_FORMAT(r.date, '%Y-%m-%d') AS date, r.amount, r.remarks, 'income' AS type,
           lg.name AS ledger_name, r.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           r.services
    FROM receipts r
    LEFT JOIN ledger_master lg ON lg.id = r.ledger_group_id
    LEFT JOIN users e ON e.id = r.via_employee_id
    WHERE YEAR(r.date) = ? AND MONTH(r.date) = ? AND r.is_deleted = 0

    UNION ALL

    SELECT DATE_FORMAT(p.date, '%Y-%m-%d') AS date, p.amount, p.remarks, 'expense' AS type,
           lg.name AS ledger_name, p.mode,
           CONCAT(COALESCE(e.first_name,''),' ',COALESCE(e.last_name,'')) AS via_employee,
           p.services
    FROM payments_expense p
    LEFT JOIN ledger_master lg ON lg.id = p.ledger_group_id
    LEFT JOIN users e ON e.id = p.via_employee_id
    WHERE YEAR(p.date) = ? AND MONTH(p.date) = ? AND p.is_deleted = 0
    ORDER BY date DESC
  `;

    db.query(
      sql,
      [selectedYear, selectedMonth, selectedYear, selectedMonth],
      (err, rows) => {
        if (err)
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: [] });

        const transactions = rows.map((r) => ({
          ...r,
          amount: parseFloat(r.amount),
          ledger_name: r.ledger_name || "",
          services: r.services || "",
        }));

        const totals = transactions.reduce(
          (acc, t) => {
            if (t.type === "income") acc.income += t.amount;
            else if (t.type === "expense") acc.expense += t.amount;
            return acc;
          },
          { income: 0, expense: 0 },
        );

        totals.profit = totals.income - totals.expense;
        totals.status =
          totals.profit > 0
            ? "profit"
            : totals.profit < 0
              ? "loss"
              : "breakeven";

        return res.status(200).json({
          error: false,
          message: "Detail fetched.",
          data: [
            {
              year: selectedYear,
              month: selectedMonth,
              transactions,
              totals,
            },
          ],
        });
      },
    );
  },

  getMobileEscrowExpenses: function (req, res) {
    const listSql = `
      SELECT r.id, r.amount, DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
             nmf.case_id AS project_name, u.first_name AS client_name,
             eu.first_name AS via_employee_name, r.mode
      FROM escrow_expense AS r
      LEFT JOIN new_mst_file AS nmf ON nmf.id = r.project_id
      LEFT JOIN users AS u ON u.id = nmf.client_id
      LEFT JOIN users AS eu ON eu.id = r.via_employee_id
      WHERE r.is_deleted = 0
      ORDER BY r.id DESC
    `;

    const totalsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN mode = 'bank' THEN amount ELSE 0 END), 0) AS bank_total,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(amount), 0) AS Amount
      FROM escrow_expense
      WHERE is_deleted = 0
    `;

    db.query(listSql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }

      db.query(totalsSql, function (err2, totalRows) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        return res.status(200).json({
          error: false,
          message: "escrow expenses fetched successfully.",
          data: rows,
          totals: {
            bank_total: totalRows[0].bank_total,
            cash_total: totalRows[0].cash_total,
            overall_total: totalRows[0].overall_total,
          },
        });
      });
    });
  },

  getMobileEscrowIncome: function (req, res) {
    const listSql = `
      SELECT r.id, r.amount, DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
             nmf.case_id AS project_name, u.first_name AS client_name,
             eu.first_name AS via_employee_name, r.mode
      FROM escrow_income AS r
      LEFT JOIN new_mst_file AS nmf ON nmf.id = r.project_id
      LEFT JOIN users AS u ON u.id = nmf.client_id
      LEFT JOIN users AS eu ON eu.id = r.via_employee_id
      WHERE r.is_deleted = 0
      ORDER BY r.id DESC
    `;

    const totalsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN mode = 'bank' THEN amount ELSE 0 END), 0) AS bank_total,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(amount), 0) AS overall_total
      FROM escrow_income
      WHERE is_deleted = 0
    `;

    db.query(listSql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }

      db.query(totalsSql, function (err2, totalRows) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        return res.status(200).json({
          error: false,
          message: "Escrow income fetched successfully.",
          data: rows,
          totals: {
            bank_total: totalRows[0].bank_total,
            cash_total: totalRows[0].cash_total,
            overall_total: totalRows[0].overall_total,
          },
        });
      });
    });
  },

  getMobileReceipts: function (req, res) {
    const listSql = `
      SELECT r.id, r.amount, DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
             IFNULL(nmf.case_id, '') AS project_name,
             IFNULL(u.first_name, '') AS client_name,
             IFNULL(eu.first_name, '') AS via_employee_name, r.mode
      FROM receipts AS r
      LEFT JOIN new_mst_file AS nmf ON nmf.id = r.project_id
      LEFT JOIN users AS u ON u.id = nmf.client_id
      LEFT JOIN users AS eu ON eu.id = r.via_employee_id
      WHERE r.is_deleted = 0
      ORDER BY r.id DESC
    `;

    const totalsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN mode = 'bank' THEN amount ELSE 0 END), 0) AS bank_total,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(amount), 0) AS overall_total
      FROM receipts
      WHERE is_deleted = 0
    `;

    db.query(listSql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }

      db.query(totalsSql, function (err2, totalRows) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        return res.status(200).json({
          error: false,
          message: "receipts fetched successfully.",
          data: rows,
          totals: {
            bank_total: totalRows[0].bank_total,
            cash_total: totalRows[0].cash_total,
            overall_total: totalRows[0].overall_total,
          },
        });
      });
    });
  },

  getMobilePaymentExpenses: function (req, res) {
    const listSql = `
      SELECT r.id, r.amount, DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
             IFNULL(nmf.case_id, '') AS project_name,
             IFNULL(u.first_name, '') AS client_name,
             IFNULL(eu.first_name, '') AS via_employee_name, r.mode
      FROM payments_expense AS r
      LEFT JOIN new_mst_file AS nmf ON nmf.id = r.project_id
      LEFT JOIN users AS u ON u.id = nmf.client_id
      LEFT JOIN users AS eu ON eu.id = r.via_employee_id
      WHERE r.is_deleted = 0
      ORDER BY r.id DESC
    `;

    const totalsSql = `
      SELECT
        COALESCE(SUM(CASE WHEN mode = 'bank' THEN amount ELSE 0 END), 0) AS bank_total,
        COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(amount), 0) AS overall_total
      FROM payments_expense
      WHERE is_deleted = 0
    `;

    db.query(listSql, function (err, rows) {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: [],
        });
      }

      db.query(totalsSql, function (err2, totalRows) {
        if (err2) {
          return res.status(500).json({
            error: true,
            message: err2.sqlMessage,
            data: [],
          });
        }

        return res.status(200).json({
          error: false,
          message: "payment expenses fetched successfully.",
          data: rows,
          totals: {
            bank_total: totalRows[0].bank_total,
            cash_total: totalRows[0].cash_total,
            overall_total: totalRows[0].overall_total,
          },
        });
      });
    });
  },
  getMobilePms: async function (req, res) {
    const { project_id, employee_id, date } = req.body;

    const conditions = ["p.is_deleted = 0"];
    const params = [];

    if (project_id) {
      conditions.push("nmf.id = ?");
      params.push(project_id);
    }

    if (employee_id) {
      conditions.push("p.created_by = ?");
      params.push(employee_id);
    }

    if (date) {
      conditions.push("DATE(p.created_at) = ?");
      params.push(date);
    }

    var sql = `SELECT 
    p.id,
    p.task,
    t.task as work,
    p.hours,
    t.sub_function,
    t.project_id,
    nmf.id as project_table_id,
    nmf.project_name as project_name,
    DATE_FORMAT(p.created_at,'%d %b %Y') as created_at,
    p.created_at as created_at_raw,
    u.first_name,
    u.id as employee_id,
    u.profile_picture,
    nmf.case_id,
    cu.first_name as client_name
     from pms as p 
  left join users as u on u.id = p.created_by 
  left join todos as t on t.id = p.task_id
  left join new_mst_file as nmf on nmf.id = t.project_id
  left join users as cu on cu.id = nmf.client_id
  where ${conditions.join(" and ")}
  order by p.id asc`;

    db.query(sql, params, function (err, result) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (result.length === 0) {
        return res
          .status(201)
          .json({ error: false, message: "Not found", data: [] });
      }

      // Group flat rows into: [{ project_id, project_name, entries: [...] }, ...]
      const groupMap = new Map();

      result.forEach((row) => {
        // Rows with no linked project (project_table_id is null) get bucketed
        // under "General" so nothing silently disappears from the response.
        const key = row.project_table_id ?? "general";
        const label = row.project_table_id
          ? row.project_name ||
            row.case_id ||
            `Project #${row.project_table_id}`
          : "General";

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            project_id: row.project_table_id ?? null,
            project_name: label,
            case_id: row.case_id || null,
            client_name: row.client_name || null,
            entries: [],
          });
        }

        groupMap.get(key).entries.push({
          id: row.id,
          task: row.task,
          work: row.work,
          hours: row.hours,
          sub_function: row.sub_function,
          first_name: row.first_name,
          employee_id: row.employee_id,
          profile_picture: row.profile_picture,
          created_at: row.created_at,
          created_at_raw: row.created_at_raw,
        });
      });

      const grouped = Array.from(groupMap.values());

      res
        .status(201)
        .json({ error: false, message: "Record fetched", data: grouped });
    });
  },
  getMobilePmstaskById: (req, res) => {
    var id = parseInt(req.body.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: [] });
    } else {
      var sql =
        "SELECT id,task,hours from pms WHERE `is_deleted`=0 and task_id=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else {
          if (result.length > 0) {
            res
              .status(201)
              .json({ error: false, message: "Record fetched", data: result });
          } else {
            res.status(201).json({
              error: false,
              message: "Requesting record not found",
              data: [],
            });
          }
        }
      });
    }
  },

  addMobilePms: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const taskId = this_data.task_id;
    const enteredHours = Number(this_data.hours);

    if (!taskId) {
      return res
        .status(500)
        .json({ error: true, message: "Missing task id", data: {} });
    }
    if (!enteredHours || isNaN(enteredHours) || enteredHours <= 0) {
      return res.status(500).json({
        error: true,
        message: "Enter a valid number of hours",
        data: {},
      });
    }

    // ── Check remaining hours before inserting ──
    const checkSql = `
    SELECT
      t.hours AS total_hours,
      COALESCE(SUM(p.hours), 0) AS used_hours
    FROM todos t
    LEFT JOIN pms p ON p.task_id = t.id AND p.is_deleted = 0
    WHERE t.id = ?
    GROUP BY t.id, t.hours
  `;

    db.query(checkSql, [taskId], function (err, rows) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const row = rows[0];
      const totalHours = row ? Number(row.total_hours) : 0;
      const usedHours = row ? Number(row.used_hours) : 0;

      if (totalHours > 0 && usedHours + enteredHours > totalHours) {
        const remaining = totalHours - usedHours;
        return res.status(500).json({
          error: true,
          message: `Only ${remaining} hour${remaining === 1 ? "" : "s"} remaining out of ${totalHours}`,
          data: {},
        });
      }

      // ── Proceed with insert ──
      const pms = {
        task_id: taskId,
        task: this_data.task,
        hours: this_data.hours,
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
            .json({ error: true, message: err.sqlMessage, data: [] });
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

  getEmpMobilePms: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const { project_id, date } = req.body;

    const conditions = ["p.is_deleted = 0", "p.created_by = ?"];
    const params = [user_id];

    if (project_id) {
      conditions.push("nmf.id = ?");
      params.push(project_id);
    }

    if (date) {
      conditions.push("DATE(p.created_at) = ?");
      params.push(date);
    }

    var sql = `SELECT 
    p.id,
    p.task,
    t.task as work,
    p.hours,
    t.sub_function,
    nmf.id as project_table_id,
    nmf.project_name as project_name,
    DATE_FORMAT(p.created_at,'%d %b %Y') as created_at,
    p.created_at as created_at_raw,
    u.first_name,
    u.profile_picture,
    nmf.case_id,
    cu.first_name as client_name
     from pms as p 
  left join users as u on u.id = p.created_by 
  left join todos as t on t.id = p.task_id
  left join new_mst_file as nmf on nmf.id = t.project_id
  left join users as cu on cu.id = nmf.client_id
  where ${conditions.join(" and ")}
  order by p.id asc`;

    db.query(sql, params, function (err, result) {
      if (err) {
        return res
          .status(201)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length === 0) {
        return res
          .status(201)
          .json({ error: false, message: "Not found", data: [] });
      }

      // Group flat rows into: [{ project_id, project_name, entries: [...] }, ...]
      const groupMap = new Map();

      result.forEach((row) => {
        const key = row.project_table_id ?? "general";
        const label = row.project_table_id
          ? row.project_name ||
            row.case_id ||
            `Project #${row.project_table_id}`
          : "General";

        if (!groupMap.has(key)) {
          groupMap.set(key, {
            project_id: row.project_table_id ?? null,
            project_name: label,
            case_id: row.case_id || null,
            client_name: row.client_name || null,
            entries: [],
          });
        }

        groupMap.get(key).entries.push({
          id: row.id,
          task: row.task,
          work: row.work,
          hours: row.hours,
          sub_function: row.sub_function,
          first_name: row.first_name,
          profile_picture: row.profile_picture,
          created_at: row.created_at,
          created_at_raw: row.created_at_raw,
        });
      });

      const grouped = Array.from(groupMap.values());

      res
        .status(201)
        .json({ error: false, message: "Record fetched", data: grouped });
    });
  },
};
