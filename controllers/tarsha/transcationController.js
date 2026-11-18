const getCurrentDateAndTime = require("../helpers/utils");
const db = require("../config/db");
module.exports = {
  add: function (req, res) {
    // const user_id = req.user ? req.user.id : null;
    const user_id = 1;
    const this_data = req.body;
    console.log("this_data==>", this_data);

    const transcation = {
      user_id: this_data.user_id,
      comp_plans_id: this_data.planId,
      transaction_type: this_data.transaction_type,
      transcation_id: this_data.transcation_id,
      amount: this_data.amount,
      gst: this_data.gst,
      round_off: this_data.round_off,
      total: this_data.total,
      transcation_status: this_data.transcation_status,
      created_at: getCurrentDateAndTime(),
      created_by: 1,
      is_deleted: 0,
      updated_at: null,
      updated_by: null,
    };

    console.log("transcation==>", transcation);

    db.query(
      "INSERT INTO transcation SET ?",
      transcation,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Transcation has been added successfully.",
          data: {
            id: result.insertId,
            // Include any other relevant data you want to send
          },
        };
        res.status(201).json(data);
      }
    );
  },

  update: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var sql =
      "SELECT *from `transcation` WHERE `id`=" + parseInt(this_data.id) + "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        // const user_id = req?.user?.id;
        const user_id = 1;
        const id = this_data?.id;

        const transcation = {
          transaction_type: this_data.transaction_type,
          transcation_id: this_data.transcation_id,
          amount: this_data.amount,
          gst: this_data.gst,
          round_off: this_data.round_off,
          total: this_data.total,
          transcation_status: this_data.transcation_status,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.id); // Just before the db.query call

        console.log("transcation===>", transcation);
        const updateSql =
          "UPDATE `transcation` SET " +
          "`transaction_type`='" +
          transcation.transaction_type +
          "'," +
          "`transcation_id`='" +
          transcation.transcation_id +
          "'," +
          "`amount`='" +
          transcation.amount +
          "'," +
          "`gst`='" +
          transcation.gst +
          "'," +
          "`round_off`='" +
          transcation.round_off +
          "'," +
          "`total`='" +
          transcation.total +
          "'," +
          "`transcation_status`='" +
          transcation.transcation_status +
          "'," +
          "`updated_at`='" +
          transcation.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(transcation.updated_by) +
          " WHERE `id`=" +
          id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Transcation has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },

  gettranscationbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql =
          "select * from transcation where is_deleted = 0 and user_id   = ?";

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

  deleteTranscation: function (req, res) {
    const transcationid = req.params.id;

    // const id = req.user.id;
    const id = 1;

    var sql =
      "UPDATE `transcation` SET `is_deleted`= 1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      transcationid +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "transcation has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getTranscationid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql = "SELECT * FROM transcation WHERE id = ?";

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
