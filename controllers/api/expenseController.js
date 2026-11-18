const {
  unlinkSingleImage,
  unlinkMultipleImages,
  getImageWithFoldername,
} = require("../../services/FileService");
const { filter_string } = require("../../services/Utility");

const PDFDocument = require("pdfkit-table");

var html_to_pdf = require("html-pdf-node");

var stream = require("stream");

module.exports = {
  DEPOSIT: 1,
  FILE_EXPENSE: 2,
  OFFICE_EXPENSE: 3,
  unlinkAllImagesStepByStep: (path) => {
    unlinkSingleImage(path);
  },
  errorStatus: (
    res,
    code = 200,
    message = "Something went wrong",
    error = true,
  ) => {
    res.status(code).json({ message: message, error: true, data: {} });
  },
  test_expense: (req, res) => {
    try {
    } catch (err) {}
    res
      .status(200)
      .json({ message: module.exports.FILE_EXPENSE, error: false, data: {} });
  },
  /*Deposit*/
  addDeposit: (req, res) => {
    try {
      req.assert("team_id", "Please select an employee").notEmpty();
      req.assert("date", "date is required").notEmpty();
      var errors = req?.validationErrors();

      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        const userId = req?.user?.id ? req?.user?.id : 0;
        const data = req?.body;

        const deposit = {
          expense_type: module.exports.DEPOSIT,
          team_id: parseInt(data?.team_id) != NaN ? parseInt(data?.team_id) : 0,
          amount: data?.amount ? parseFloat(data?.amount) : null,
          description: data?.description.trim()
            ? filter_string(data?.description)
            : "",
          date: data?.date,
          isdeleted: 0,
          is_approved: 1,
          created_by: userId,
          created_at: getCurrentDateAndTime(),
        };

        var sql = "INSERT INTO `deposit_expense` SET ?";

        db.query(sql, deposit, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err?.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ message: "Changes saved!", error: false, data: {} });
          }
        });
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  getDeposit: (req, res) => {
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.DEPOSIT +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
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
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  getDepositById: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN ? parseInt(req?.params?.id) : null;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`id`=" +
          id +
          " and `de`.`isdeleted`=0 and `de`.`expense_type`=" +
          module.exports.DEPOSIT +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err?.sqlMessage, error: true, data: {} });
          } else if (result.length > 0) {
            res
              .status(200)
              .json({ message: "Record fetched", error: false, data: result });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: true, data: [] });
          }
        });
      } else {
        module.exports.errorStatus(res);
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  deleteDepositById: (req, res) => {
    try {
      const id =
        parseInt(req?.params?.id) != NaN ? parseInt(req?.params?.id) : null;
      if (id) {
        const userId =
          parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : 0;
        const data = {
          isdeleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by: userId,
        };
        var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";
        db.query(sql, data, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err?.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ message: "Removed!", error: false, data: {} });
          }
        });
      } else {
        module.exports.errorStatus(res);
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  updateDepositById: (req, res) => {
    try {
      req.assert("id", "ID is missing").notEmpty();
      req.assert("team_id", "Please select an employee").notEmpty();
      req.assert("date", "date is required").notEmpty();

      var errors = req?.validationErrors();
      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        const userId = req?.user?.id ? req?.user?.id : 0;
        const data = req?.body;
        const depositId = parseInt(data?.id);

        const deposit = {
          expense_type: module.exports.DEPOSIT,
          team_id: parseInt(data?.team_id) != NaN ? parseInt(data?.team_id) : 0,
          amount: data?.amount ? parseFloat(data?.amount) : null,
          description: data?.description.trim()
            ? filter_string(data?.description)
            : "",
          date: data?.date,
          is_approved: 1,
          updated_by: userId,
          updated_at: getCurrentDateAndTime(),
        };

        var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + depositId + "";

        db.query(sql, deposit, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err?.sqlMessage, error: true, data: {} });
          } else {
            res
              .status(200)
              .json({ message: "Changes saved!", data: {}, error: false });
          }
        });
      }
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  /*--Deposit--*/

  /* Office-Expense*/

  addOfficeExpenseByTeam: function (req, res) {
    const files = [];
    let receipt_image = "";
    let submitters_img1 = "";
    let submitters_img2 = "";
    let submitters_img3 = "";

    req.files.forEach((file) => {
      if (file.fieldname === "receipt_image") {
        receipt_image = getImageWithFoldername(file.path);
        files.push(receipt_image);
      } else if (file.fieldname === "submitters_img1") {
        submitters_img1 = getImageWithFoldername(file.path);
        files.push(submitters_img1);
      } else if (file.fieldname === "submitters_img2") {
        submitters_img2 = getImageWithFoldername(file.path);
        files.push(submitters_img2);
      } else if (file.fieldname === "submitters_img3") {
        submitters_img3 = getImageWithFoldername(file.path);
        files.push(submitters_img3);
      } else {
        unlinkImage(file.path);
      }
    });

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const document = {
      amount: this_data.amount,
      expense_type: module.exports.OFFICE_EXPENSE,
      description: this_data.description,
      date: this_data.date,
      team_id: parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : null,
      description: this_data?.description.trim()
        ? filter_string(this_data?.description)
        : null,
      receipt_image: receipt_image,
      submitters_img1: submitters_img1,
      submitters_img2: submitters_img2,
      submitters_img3: submitters_img3,
      isdeleted: 0,
      is_approved: 0,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
    };

    db.query(
      "INSERT INTO deposit_expense SET ?",
      document,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        return res.status(201).json({
          error: false,
          message: "Office expense has been added successfully.",
          data: { id: result.insertId },
        });
      },
    );
  },

  UpdateOfficeExpenseByTeam: (req, res) => {
    try {
      const data = JSON.parse(JSON.stringify(req?.body));

      req.assert("amount", "Amount is required.").notEmpty();
      req.assert("date", "date is required").notEmpty();

      const errors = req.validationErrors();

      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        let oldFiles = [];
        let newFiles = [];

        let receipt_image = "";
        let submitters_img1 = "";
        let submitters_img2 = "";
        let submitters_img3 = "";

        if (req.files.length > 0) {
          req.files.forEach((f) => {
            if (f.fieldname === "receipt_image") {
              receipt_image = getImageWithFoldername(f.path);
              newFiles.push(receipt_image);
            } else if (f.fieldname === "submitters_img1") {
              submitters_img1 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img1);
            } else if (f.fieldname === "submitters_img2") {
              submitters_img2 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img2);
            } else if (f.fieldname === "submitters_img3") {
              submitters_img3 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img3);
            } else {
              /*Remove others name images*/
              unlinkSingleImage(getImageWithFoldername(f.path));
            }
          });
        }

        var sql =
          "SELECT * from `deposit_expense`  WHERE `id`=" +
          parseInt(data?.id) +
          " and `isdeleted`=0 and `is_approved`=0 or `is_approved`=2";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              receipt_image
                ? oldFiles.push(result[0].receipt_image)
                : (receipt_image = result[0].receipt_image);
              submitters_img1
                ? oldFiles.push(result[0].submitters_img1)
                : (submitters_img1 = result[0].submitters_img1);
              submitters_img2
                ? oldFiles.push(result[0].submitters_img2)
                : (submitters_img2 = result[0].submitters_img2);
              submitters_img3
                ? oldFiles.push(result[0].submitters_img3)
                : (submitters_img3 = result[0].submitters_img3);

              const expenseData = {
                amount:
                  parseFloat(data?.amount) != NaN
                    ? parseFloat(data?.amount)
                    : null,
                description: data?.description.trim()
                  ? filter_string(data?.description)
                  : null,
                date: data?.date,
                receipt_image: receipt_image,
                submitters_img1: submitters_img1,
                submitters_img2: submitters_img2,
                submitters_img3: submitters_img3,
                updated_by:
                  parseInt(req?.user?.id) != NaN
                    ? parseInt(req?.user?.id)
                    : null,
                updated_at: getCurrentDateAndTime(),
              };

              var sql =
                "UPDATE `deposit_expense` SET ? WHERE `id`=" +
                parseInt(data?.id) +
                "";
              db.query(sql, expenseData, (err, result) => {
                if (err) {
                  console.log(err);
                  unlinkMultipleImages(newFiles);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(200).json({
                    error: false,
                    message: "Changes saved!",
                    data: {},
                  });
                }
              });
            } else {
              unlinkMultipleImages(newFiles);
              res.status(200).json({
                error: true,
                message: "Changes permission denied",
                data: {},
              });
            }
          }
        });
      }
    } catch (err) {
      if (req?.files?.length > 0)
        (req?.files).forEach((f) => unlinkSingleImage(f?.path));
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  getOfficeExpenseOfAdmin: (req, res) => {
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.OFFICE_EXPENSE +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(200).json({ error: true, message: "Not found", data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  viewOfficeExpenseOfTeam: (req, res) => {
    try {
      const id =
        parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : undefined;
      // const id = 50;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
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
          } else {
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

  viewOfficeExpenseOfTeamForAdmin: (req, res) => {
    try {
      const id =
        parseInt(req?.body?.id) != NaN ? parseInt(req?.body?.id) : undefined;
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
  getOfficeExpenseById: (req, res) => {
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`de`.`team_id`,`de`.`amount`,`de`.`receipt_image`,`de`.`submitters_img1`,`de`.`submitters_img2`,`de`.`submitters_img3`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.OFFICE_EXPENSE +
        " and `de`.`id`=" +
        req?.params?.id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(200).json({ error: true, message: "Not found", data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  UpdateOfficeExpenseByTeamForAdmin: (req, res) => {
    try {
      const data = JSON.parse(JSON.stringify(req?.body));

      req.assert("amount", "Amount is required.").notEmpty();
      req.assert("date", "date is required").notEmpty();

      const errors = req.validationErrors();

      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        let oldFiles = [];
        let newFiles = [];

        let receipt_image = "";
        let submitters_img1 = "";
        let submitters_img2 = "";
        let submitters_img3 = "";

        if (req.files.length > 0) {
          req.files.forEach((f) => {
            if (f.fieldname === "receipt_image") {
              receipt_image = getImageWithFoldername(f.path);
              newFiles.push(receipt_image);
            } else if (f.fieldname === "submitters_img1") {
              submitters_img1 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img1);
            } else if (f.fieldname === "submitters_img2") {
              submitters_img2 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img2);
            } else if (f.fieldname === "submitters_img3") {
              submitters_img3 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img3);
            } else {
              /*Remove others name images*/
              unlinkSingleImage(getImageWithFoldername(f.path));
            }
          });
        }

        var sql =
          "SELECT * from `deposit_expense`  WHERE `id`=" +
          parseInt(data?.id) +
          "";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              receipt_image
                ? oldFiles.push(result[0].receipt_image)
                : (receipt_image = result[0].receipt_image);
              submitters_img1
                ? oldFiles.push(result[0].submitters_img1)
                : (submitters_img1 = result[0].submitters_img1);
              submitters_img2
                ? oldFiles.push(result[0].submitters_img2)
                : (submitters_img2 = result[0].submitters_img2);
              submitters_img3
                ? oldFiles.push(result[0].submitters_img3)
                : (submitters_img3 = result[0].submitters_img3);

              const expenseData = {
                amount:
                  parseFloat(data?.amount) != NaN
                    ? parseFloat(data?.amount)
                    : null,
                description: data?.description.trim()
                  ? filter_string(data?.description)
                  : null,
                date: data?.date,
                is_approved:
                  data?.is_approved == 1 ||
                  data?.is_approved == 2 ||
                  data?.is_approved == 3
                    ? parseInt(data?.is_approved)
                    : result[0]?.is_approved
                      ? result[0]?.is_approved
                      : 0,
                receipt_image: receipt_image,
                submitters_img1: submitters_img1,
                submitters_img2: submitters_img2,
                submitters_img3: submitters_img3,
                updated_by:
                  parseInt(req?.user?.id) != NaN
                    ? parseInt(req?.user?.id)
                    : null,
                updated_at: getCurrentDateAndTime(),
              };

              var sql =
                "UPDATE `deposit_expense` SET ? WHERE `id`=" +
                parseInt(data?.id) +
                "";
              db.query(sql, expenseData, (err, result) => {
                if (err) {
                  console.log(err);
                  unlinkMultipleImages(newFiles);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(200).json({
                    error: false,
                    message: "Changes saved!",
                    data: {},
                  });
                }
              });
            } else {
              unlinkMultipleImages(newFiles);
              res.status(200).json({
                error: true,
                message: "Changes permission denied",
                data: {},
              });
            }
          }
        });
      }
    } catch (err) {
      if (req?.files?.length > 0)
        (req?.files).forEach((f) => unlinkSingleImage(f?.path));
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  deleteOfficeExpenseById: (req, res) => {
    try {
      const id = parseInt(req?.params.id)
        ? parseInt(req?.params?.id)
        : undefined;
      if (id) {
        const data = {
          isdeleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by: req?.user?.id,
        };

        var sql =
          "SELECT *FROM `deposit_expense` WHERE (`is_approved`=0  or `is_approved`=2)  and `id`=" +
          id +
          " and isdeleted=0";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";
              var sql1 =
                "SELECT sum(`amount`) as `total_deposit` FROM `deposit_expense` WHERE `team_id`=" +
                req?.user?.id +
                " and `isdeleted`=0 and `expense_type`=" +
                module.exports.DEPOSIT +
                "";

              var sql2 =
                "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`=" +
                req?.user?.id +
                " and `isdeleted`=0 and `expense_type` in (" +
                module.exports.FILE_EXPENSE +
                "," +
                module.exports.OFFICE_EXPENSE +
                ")";

              db.query(`${sql};${sql1};${sql2}`, data, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  const total_deposit = result[1][0]?.total_deposit
                    ? result[1][0]?.total_deposit
                    : 0;
                  const total_expense = result[2][0]?.total_expense
                    ? result[2][0]?.total_expense
                    : 0;
                  var final_total_amount = total_deposit - total_expense;

                  res.status(200).json({
                    error: false,
                    message: "!Removed",
                    data: { final_total_amount: final_total_amount },
                  });
                }
              });
            } else {
              res
                .status(200)
                .json({ error: true, message: "Can't be removed!", data: {} });
            }
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
  deleteOfficeExpenseByIdForAdmin: (req, res) => {
    try {
      const id = parseInt(req?.params.id)
        ? parseInt(req?.params?.id)
        : undefined;
      if (id) {
        const data = {
          isdeleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by: req?.user?.id,
        };

        var sql =
          "SELECT *FROM `deposit_expense` WHERE `id`=" +
          id +
          " and `isdeleted`=0";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";

              db.query(sql, data, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res
                    .status(200)
                    .json({ error: false, message: "!Removed", data: {} });
                }
              });
            } else {
              res.status(200).json({
                error: true,
                message: "Record doesn't exist or removed already!",
                data: {},
              });
            }
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
  verifyOfficeExpenseById: (req, res) => {
    try {
      const data = req.body;
      const id = parseInt(data.id) != NaN ? parseInt(data?.id) : undefined;

      if (id) {
        var sql =
          "SELECT *FROM `deposit_expense` WHERE `isdeleted`=0  and `id`=" +
          id +
          "";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              const officeExpenseData = {
                is_approved:
                  parseInt(data?.is_approved) === 1 ||
                  parseInt(data?.is_approved) === 0 ||
                  parseInt(data?.is_approved) === 2
                    ? parseInt(data?.is_approved)
                    : parseInt(result[0].is_approved),
                updated_at: getCurrentDateAndTime(),
                updated_by: req?.user?.id,
              };

              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";

              db.query(sql, officeExpenseData, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(200).json({
                    error: false,
                    message: "Changes saved!",
                    data: {},
                  });
                }
              });
            } else {
              res.status(200).json({
                error: true,
                message: "You cannot delete the record",
                data: {},
              });
            }
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
  addFileExpense: (req, res) => {
    try {
      req.assert("amount", "Amount is required.").notEmpty();
      req.assert("date", "date is required").notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        res.status(200).json({ message: errors[0].msg, data: {}, error: true });
      } else {
        const this_data = JSON.parse(JSON.stringify(req.body));
        var files = [];
        var unnecessary_files = [];
        var receipt_image = "";
        var submitters_img1 = "";
        var submitters_img2 = "";
        var submitters_img3 = "";
        req.files.forEach((f) => {
          if (f.fieldname === "receipt_image") {
            receipt_image = getImageWithFoldername(f.path);
            files.push(receipt_image);
          } else if (f.fieldname === "submitters_img1") {
            submitters_img1 = getImageWithFoldername(f.path);
            files.push(submitters_img1);
          } else if (f.fieldname === "submitters_img2") {
            submitters_img2 = getImageWithFoldername(f.path);
            files.push(submitters_img2);
          } else if (f.fieldname === "submitters_img3") {
            submitters_img3 = getImageWithFoldername(f.path);
            files.push(submitters_img3);
          } else {
            unnecessary_files.push(getImageWithFoldername(f.path));
          }
        });

        /*Remove unnecessary files which are not receipt_image,submitters_img1,submitters_img2,submitters_img3 */
        unlinkMultipleImages(unnecessary_files);

        if (!receipt_image) {
          /*If receipt image is not uploaded then remove submitters_img1,submitters_img2,submitters_img3*/
          unlinkMultipleImages(files);

          var data = {
            error: true,
            message: "Please upload the receipt",
            data: {},
          };
          res.status(201).send(data);
        }

        const userId = req?.user?.id ? req?.user?.id : 0;
        var expense = {
          file_id: this_data.file_id,
          amount: this_data.amount,
          description: this_data.description ? this_data.description : "",
          date: this_data.date,
          receipt_image: receipt_image ? receipt_image : "",
          submitters_img1: submitters_img1,
          submitters_img2: submitters_img2,
          submitters_img3: submitters_img3,
          created_by: userId,
          created_at: getCurrentDateAndTime(), //getCurrentDateAndTime() -> from app.js
        };

        db.query(
          "INSERT INTO file_expense SET ?",
          expense,
          function (err, result) {
            if (err) {
              /*If error occur then remove all the images*/
              unlinkMultipleImages(files);

              var data = { error: true, message: err.sqlMessage, data: {} };
              res.status(201).send(data);
            } else {
              $sql =
                "SELECT `file_expense`.*,`mst_file`.`file_name` FROM `file_expense` LEFT JOIN `mst_file` ON `mst_file`.`id`=`file_expense`.`file_id` WHERE `file_expense`.`isdeleted`=0 and `file_expense`.`id`='" +
                result.insertId +
                "'";
              db.query($sql, async function (err, user) {
                if (err) {
                  var data = { error: true, message: err.sqlMessage, data: {} };
                  res.status(201).send(data);
                } else {
                  var data = {
                    error: false,
                    message: "File expense has been added successfully.",
                    data: user[0],
                  };
                  res.status(201).send(data);
                }
              });
            }
          },
        );
      }
    } catch (err) {
      console.log(err);
      req.files.forEach((f) => {
        unlinkSingleImage(f?.path);
      });
      res.status(200).json({
        message: "Unable to save the changes, Something went wrong",
        error: true,
        data: {},
      });
    }
  },

  /*-OFFICE-EXPENSE*/

  /*File-expense*/
  addFileExpenseByTeam: (req, res) => {
    try {
      const data = JSON.parse(JSON.stringify(req?.body));

      req.assert("amount", "Amount is required.").notEmpty();
      req.assert("date", "date is required").notEmpty();
      req.assert("mst_file_id", "File is required").notEmpty();

      const errors = req.validationErrors();

      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        let files = [];
        let unnecessary_files = [];

        let receipt_image = "";
        let submitters_img1 = "";
        let submitters_img2 = "";
        let submitters_img3 = "";

        if (req.files.length > 0) {
          req.files.forEach((f) => {
            if (f.fieldname === "receipt_image") {
              receipt_image = getImageWithFoldername(f.path);
              files.push(receipt_image);
            } else if (f.fieldname === "submitters_img1") {
              submitters_img1 = getImageWithFoldername(f.path);
              files.push(submitters_img1);
            } else if (f.fieldname === "submitters_img2") {
              submitters_img2 = getImageWithFoldername(f.path);
              files.push(submitters_img2);
            } else if (f.fieldname === "submitters_img3") {
              submitters_img3 = getImageWithFoldername(f.path);
              files.push(submitters_img3);
            } else {
              unnecessary_files.push(getImageWithFoldername(f.path));
            }
          });
        }

        unlinkMultipleImages(unnecessary_files);

        const expenseData = {
          amount:
            parseFloat(data?.amount) != NaN ? parseFloat(data?.amount) : null,
          mst_file_id:
            parseInt(data?.mst_file_id) != NaN
              ? parseInt(data?.mst_file_id)
              : null,
          expense_type: module.exports.FILE_EXPENSE,
          team_id:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : null,
          description: data?.description.trim()
            ? filter_string(data?.description)
            : null,
          date: data?.date,
          receipt_image: receipt_image,
          submitters_img1: submitters_img1,
          submitters_img2: submitters_img2,
          submitters_img3: submitters_img3,
          isdeleted: 0,
          is_approved: 0,
          created_by:
            parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : null,
          created_at: getCurrentDateAndTime(),
        };

        var sql = "INSERT INTO `deposit_expense` SET ? ";
        db.query(sql, expenseData, (err, result) => {
          if (err) {
            unlinkMultipleImages(files);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            res
              .status(200)
              .json({ error: false, message: "Changes saved!", data: {} });
          }
        });
      }
    } catch (err) {
      if (req?.files?.length > 0)
        (req?.files).forEach((f) => unlinkSingleImage(f?.path));
      console.log(err);
      module.exports.errorStatus(err);
    }
  },

  getFileExpenseByMstFileId: (req, res) => {
    try {
      var sql1 =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`receipt_image`,`de`.`submitters_img1`,`de`.`submitters_img2`,`de`.`submitters_img3`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        " and `de`.`mst_file_id`=" +
        req?.params?.id;

      var sql2 =
        "SELECT sum(`de`.`amount`) as `total_expense`,`mf`.`file_name` FROM `deposit_expense` as `de` RIGHT JOIN `mst_file` as `mf` ON  `mf`.`id`=`de`.`mst_file_id` WHERE `mst_file_id`=" +
        req.params?.id +
        " and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        " and `de`.`isdeleted`=0";

      db.query(sql1, (err1, result1) => {
        if (err1) {
          res
            .status(200)
            .json({ error: true, message: err1.sqlMessage, data: {} });
          return;
        }

        db.query(sql2, (err2, result2) => {
          if (err2) {
            res
              .status(200)
              .json({ error: true, message: err2.sqlMessage, data: {} });
            return;
          }

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result1,
            expense: result2,
          });
        });
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },

  getFileExpenseByMstFileIdPdf: (req, res) => {
    try {
      const queryData = req?.query;

      if (queryData?.start_date && queryData?.end_date) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`receipt_image`,`de`.`submitters_img1`,`de`.`submitters_img2`,`de`.`submitters_img3`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
          module.exports.FILE_EXPENSE +
          " and `de`.`mst_file_id`=" +
          req?.params?.id +
          " and `de`.`date` BETWEEN '" +
          queryData?.start_date +
          "' AND '" +
          queryData?.end_date +
          "'";
      } else {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`receipt_image`,`de`.`submitters_img1`,`de`.`submitters_img2`,`de`.`submitters_img3`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
          module.exports.FILE_EXPENSE +
          " and `de`.`mst_file_id`=" +
          req?.params?.id +
          "";
      }

      var sql2 =
        "SELECT sum(`de`.`amount`) as `total_expense`,`mf`.`file_name` FROM `deposit_expense` as `de` RIGHT JOIN `mst_file` as `mf` ON  `mf`.`id`=`de`.`mst_file_id` WHERE `mst_file_id`=" +
        req.params?.id +
        " and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        " and `de`.`isdeleted`=0";

      db.query(`${sql};${sql2}`, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: result[0],
            expense: result[1],
          });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },

  getFileExpenseOfAdmin: (req, res) => {
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`case_id` as file_name,cu.first_name as client_name,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `new_mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` LEFT JOIN users as cu on cu.id = mf.client_id  WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(200).json({ error: true, message: "Not found", data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  getFileExpenseOfAdminbyid: (req, res) => {
    const id = req.params.id;
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`case_id` as file_name,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `new_mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id`  WHERE `de`.`isdeleted`=0 and  `de`.`mst_file_id`=?  and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        "";
      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(200).json({ error: true, message: "Not found", data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  viewFileExpenseOfTeam: (req, res) => {
    try {
      const id =
        parseInt(req?.user?.id) != NaN ? parseInt(req?.user?.id) : undefined;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`case_id` as file_name,`de`.`team_id`,`de`.`amount`,DATE_FORMAT(de.date, '%d %b %Y') AS date,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `new_mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id`  WHERE `de`.`isdeleted`=0 and `de`.`expense_type` =" +
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
          } else {
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

  viewFileExpenseOfTeamForAdmin: (req, res) => {
    try {
      const id =
        parseInt(req?.body?.id) != NaN ? parseInt(req?.body?.id) : undefined;
      // const id = 50;
      if (id) {
        var sql =
          "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
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
          } else {
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
  getFileExpenseById: (req, res) => {
    try {
      var sql =
        "SELECT `de`.`id`,`u`.`first_name`,`u`.`last_name`,concat(`u`.`first_name`,' ',`u`.`last_name`) as `team_fullname`,`de`.`description`,`expense_type`,`de`.`mst_file_id`,`mf`.`office_file_no`,`mf`.`file_name`,`de`.`team_id`,`de`.`amount`,`de`.`receipt_image`,`de`.`submitters_img1`,`de`.`submitters_img2`,`de`.`submitters_img3`,`de`.`date`,`de`.`isdeleted`,`de`.`is_approved`,`de`.`created_by`,`de`.`created_at` FROM `deposit_expense` as `de` LEFT JOIN `users` as `u` ON `u`.`id`=`de`.`team_id` LEFT JOIN `mst_file` as `mf` ON `mf`.`id`=`de`.`mst_file_id` WHERE `de`.`isdeleted`=0 and `de`.`expense_type`=" +
        module.exports.FILE_EXPENSE +
        " and `de`.`id`=" +
        req?.params?.id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(200).json({ error: true, message: "Not found", data: {} });
        }
      });
    } catch (err) {
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  UpdateFileExpenseByTeamForAdmin: (req, res) => {
    try {
      const data = JSON.parse(JSON.stringify(req?.body));

      req.assert("amount", "Amount is required.").notEmpty();
      req.assert("date", "date is required").notEmpty();
      req.assert("mst_file_id", "File is required").notEmpty();

      const errors = req.validationErrors();

      if (errors) {
        module.exports.errorStatus(res, 200, errors[0]?.msg);
      } else {
        let oldFiles = [];
        let newFiles = [];

        let receipt_image = "";
        let submitters_img1 = "";
        let submitters_img2 = "";
        let submitters_img3 = "";

        if (req.files.length > 0) {
          req.files.forEach((f) => {
            if (f.fieldname === "receipt_image") {
              receipt_image = getImageWithFoldername(f.path);
              newFiles.push(receipt_image);
            } else if (f.fieldname === "submitters_img1") {
              submitters_img1 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img1);
            } else if (f.fieldname === "submitters_img2") {
              submitters_img2 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img2);
            } else if (f.fieldname === "submitters_img3") {
              submitters_img3 = getImageWithFoldername(f.path);
              newFiles.push(submitters_img3);
            } else {
              /*Remove others name images*/
              unlinkSingleImage(getImageWithFoldername(f.path));
            }
          });
        }

        var sql =
          "SELECT * from `deposit_expense`  WHERE `id`=" +
          parseInt(data?.id) +
          "";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              receipt_image
                ? oldFiles.push(result[0].receipt_image)
                : (receipt_image = result[0].receipt_image);
              submitters_img1
                ? oldFiles.push(result[0].submitters_img1)
                : (submitters_img1 = result[0].submitters_img1);
              submitters_img2
                ? oldFiles.push(result[0].submitters_img2)
                : (submitters_img2 = result[0].submitters_img2);
              submitters_img3
                ? oldFiles.push(result[0].submitters_img3)
                : (submitters_img3 = result[0].submitters_img3);

              const expenseData = {
                amount:
                  parseFloat(data?.amount) != NaN
                    ? parseFloat(data?.amount)
                    : null,
                description: data?.description.trim()
                  ? filter_string(data?.description)
                  : null,
                mst_file_id:
                  parseInt(data?.mst_file_id) != NaN
                    ? parseInt(data?.mst_file_id)
                    : null,
                date: data?.date,
                is_approved:
                  data?.is_approved == 1 ||
                  data?.is_approved == 2 ||
                  data?.is_approved == 3
                    ? parseInt(data?.is_approved)
                    : result[0]?.is_approved
                      ? result[0]?.is_approved
                      : 0,
                receipt_image: receipt_image,
                submitters_img1: submitters_img1,
                submitters_img2: submitters_img2,
                submitters_img3: submitters_img3,
                updated_by:
                  parseInt(req?.user?.id) != NaN
                    ? parseInt(req?.user?.id)
                    : null,
                updated_at: getCurrentDateAndTime(),
              };

              var sql =
                "UPDATE `deposit_expense` SET ? WHERE `id`=" +
                parseInt(data?.id) +
                "";
              db.query(sql, expenseData, (err, result) => {
                if (err) {
                  console.log(err);
                  unlinkMultipleImages(newFiles);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(200).json({
                    error: false,
                    message: "Changes saved!",
                    data: {},
                  });
                }
              });
            } else {
              unlinkMultipleImages(newFiles);
              res.status(200).json({
                error: true,
                message: "Sorry, Expense can't be edited",
                data: {},
              });
            }
          }
        });
      }
    } catch (err) {
      if (req?.files?.length > 0)
        (req?.files).forEach((f) => unlinkSingleImage(f?.path));
      console.log(err);
      module.exports.errorStatus(res);
    }
  },
  deleteFileExpenseById: (req, res) => {
    try {
      const id = parseInt(req?.params.id)
        ? parseInt(req?.params?.id)
        : undefined;
      if (id) {
        const data = {
          isdeleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by: req?.user?.id,
        };

        var sql =
          "SELECT *FROM `deposit_expense` WHERE (`is_approved`=0  or `is_approved`=2) and `id`=" +
          id +
          " and `isdeleted`=0";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";
              var sql1 =
                "SELECT sum(`amount`) as `total_deposit` FROM `deposit_expense` WHERE `team_id`=" +
                req?.user?.id +
                " and `isdeleted`=0 and `expense_type`=" +
                module.exports.DEPOSIT +
                "";

              var sql2 =
                "SELECT sum(`amount`) as `total_expense` FROM `deposit_expense` WHERE `team_id`=" +
                req?.user?.id +
                " and `isdeleted`=0 and `expense_type` in (" +
                module.exports.FILE_EXPENSE +
                "," +
                module.exports.OFFICE_EXPENSE +
                ")";

              db.query(`${sql};${sql1};${sql2}`, data, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  const total_deposit = result[1][0]?.total_deposit
                    ? result[1][0]?.total_deposit
                    : 0;
                  const total_expense = result[2][0]?.total_expense
                    ? result[2][0]?.total_expense
                    : 0;
                  var final_total_amount = total_deposit - total_expense;

                  res.status(200).json({
                    error: false,
                    message: "Removed!",
                    data: { final_total_amount: final_total_amount },
                  });
                }
              });
            } else {
              res
                .status(200)
                .json({ error: true, message: "Can't be removed!", data: {} });
            }
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
  deleteFileExpenseByIdForAdmin: (req, res) => {
    try {
      const id = parseInt(req?.params.id)
        ? parseInt(req?.params?.id)
        : undefined;
      if (id) {
        const data = {
          isdeleted: 1,
          updated_at: getCurrentDateAndTime(),
          updated_by: req?.user?.id,
        };

        var sql =
          "SELECT *FROM `deposit_expense` WHERE  `id`=" +
          id +
          " and isdeleted=0";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";

              db.query(sql, data, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res
                    .status(200)
                    .json({ error: false, message: "Removed!", data: {} });
                }
              });
            } else {
              res.status(200).json({
                error: true,
                message: "Record doesn't exist or already been removed!",
                data: {},
              });
            }
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
  verifyFileExpenseById: (req, res) => {
    try {
      const data = req.body;
      const id = parseInt(data.id) != NaN ? parseInt(data?.id) : undefined;

      if (id) {
        var sql =
          "SELECT *FROM `deposit_expense` WHERE `isdeleted`=0  and `id`=" +
          id +
          "";

        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else {
            if (result.length > 0) {
              const officeExpenseData = {
                is_approved:
                  parseInt(data?.is_approved) === 1 ||
                  parseInt(data?.is_approved) === 0 ||
                  parseInt(data?.is_approved) === 2
                    ? parseInt(data?.is_approved)
                    : parseInt(result[0].is_approved),
                updated_at: getCurrentDateAndTime(),
                updated_by: req?.user?.id,
              };

              var sql = "UPDATE `deposit_expense` SET ? WHERE `id`=" + id + "";

              db.query(sql, officeExpenseData, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(200).json({
                    error: false,
                    message: "Changes saved!",
                    data: {},
                  });
                }
              });
            } else {
              res.status(200).json({
                error: true,
                message: "You cannot delete the record",
                data: {},
              });
            }
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

  getDepositExpenseByTeamId: (req, res) => {
    try {
      const team_id = parseInt(req.params.id) || undefined;

      var sql =
        "SELECT `de`.`id`, `u`.`first_name`, `u`.`last_name`, CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `team_fullname`, `de`.`description`, `expense_type`, `de`.`mst_file_id`, `mf`.`file_name`, `de`.`team_id`, `de`.`amount`, `de`.`date`, `de`.`isdeleted`, `de`.`is_approved`, `de`.`created_by`, `de`.`created_at` FROM `deposit_expense` AS `de` LEFT JOIN `users` AS `u` ON `u`.`id` = `de`.`team_id` LEFT JOIN `mst_file` AS `mf` ON `mf`.`id` = `de`.`mst_file_id` WHERE `de`.`isdeleted` = 0 AND `de`.`team_id` = ?";

      var sql2 =
        "SELECT SUM(`amount`) AS `total_deposit` FROM `deposit_expense` WHERE isdeleted = 0 and `team_id` = ? AND `expense_type` <> 2";

      var sql3 =
        "SELECT SUM(`amount`) AS `total_expense` FROM `deposit_expense` WHERE isdeleted = 0 and `team_id` = ? AND `expense_type` <> 1";

      var sql4 =
        "SELECT CONCAT(`u`.`first_name`, ' ', `u`.`last_name`) AS `team_fullname` FROM `users` AS `u` WHERE `u`.`id` = ?";

      const query = `${sql}; ${sql2}; ${sql3}; ${sql4}`;
      const values = [team_id, team_id, team_id, team_id];

      db.query(sql, [team_id], (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          db.query(sql2, [team_id], (err, result2) => {
            if (err) {
              res
                .status(200)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              db.query(sql3, [team_id], (err, result3) => {
                if (err) {
                  res
                    .status(200)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  db.query(sql4, [team_id], (err, result4) => {
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

  getDepositExpenseByTeamIdForPdf: (req, res) => {
    try {
      const queryData = req?.query;
      const team_id = parseInt(req.params.id) || undefined;
      const { start_date, end_date } = req.query;

      const sql = `
                SELECT 
                    de.id, 
                    u.first_name, 
                    u.last_name, 
                    CONCAT(u.first_name, ' ', u.last_name) AS team_fullname,
                    de.description, 
                    expense_type, 
                    de.mst_file_id, 
                    mf.file_name, 
                    de.team_id, 
                    de.amount, 
                    de.date, 
                    de.isdeleted, 
                    de.is_approved, 
                    de.created_by, 
                    de.created_at
                FROM 
                    deposit_expense AS de 
                    LEFT JOIN users AS u ON u.id = de.team_id 
                    LEFT JOIN mst_file AS mf ON mf.id = de.mst_file_id 
                WHERE 
                    de.isdeleted = 0 
                    AND de.team_id = ? 
                    AND de.date >= ? 
                    AND de.date <= ?`;

      const sql2 =
        "SELECT SUM(amount) AS total_deposit FROM deposit_expense WHERE team_id = ? AND expense_type = ?";
      const sql3 =
        "SELECT SUM(amount) AS total_expense FROM deposit_expense WHERE team_id = ? AND expense_type != ?";
      const sql4 =
        "SELECT CONCAT(u.first_name, ' ', u.last_name) AS team_fullname FROM users AS u WHERE u.id = ?";

      db.query(sql, [team_id, start_date, end_date], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            error: true,
            message: "Error fetching records.",
            data: {},
          });
        }

        const data = result;

        db.query(sql2, [team_id, module.exports.DEPOSIT], (err, result2) => {
          if (err) {
            console.error(err);
            return res.status(500).json({
              error: true,
              message: "Error fetching total deposit.",
              data: {},
            });
          }

          const total_deposit = result2[0]?.total_deposit;

          db.query(sql3, [team_id, module.exports.DEPOSIT], (err, result3) => {
            if (err) {
              console.error(err);
              return res.status(500).json({
                error: true,
                message: "Error fetching total expense.",
                data: {},
              });
            }

            const total_expense = result3[0]?.total_expense;

            db.query(sql4, [team_id], (err, result4) => {
              if (err) {
                console.error(err);
                return res.status(500).json({
                  error: true,
                  message: "Error fetching team data.",
                  data: {},
                });
              }

              const team_data = result4;

              return res.status(200).json({
                error: false,
                message: "Record Fetched",
                data,
                total_deposit,
                total_expense,
                team_data,
              });
            });
          });
        });
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: true, message: "Internal server error.", data: {} });
    }
  },
};
