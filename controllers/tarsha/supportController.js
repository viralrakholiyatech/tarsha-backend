const getCurrentDateAndTime = require("../helpers/utils");
const db = require("../config/db");
module.exports = {
  getsupportlist: async function (req, res) {
    var sql = "SELECT * FROM support where is_deleted = 0";

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

  deletesupport: function (req, res) {
    const Suportid = req.params.id;

    // const id = req.user.id;
    const id = 1;

    var sql =
      "UPDATE `support` SET `is_deleted`= 1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      Suportid +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "support has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  updatesupport: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var sql =
      "SELECT *from `support` WHERE `id`=" + parseInt(this_data.id) + "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        // const user_id = req?.user?.id;
        const user_id = 1;
        const id = this_data?.id;

        const support = {
          status: this_data.status,
          message: this_data.message,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.id); // Just before the db.query call

        console.log("support===>", support);
        const updateSql =
          "UPDATE `support` SET " +
          "`status`='" +
          support.status +
          "'," +
          "`message`='" +
          support.message +
          "'," +
          "`updated_at`='" +
          support.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(support.updated_by) +
          " WHERE `id`=" +
          id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "support has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },

  getsupportbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql = "SELECT * FROM support WHERE id = ?";

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(500)
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
          .status(400)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
};
