const getCurrentDateAndTime = require("../helpers/utils");
const db = require("../config/db");
module.exports = {
  add: function (req, res) {
    // const user_id = req.user ? req.user.id : null;
    const user_id = 1;
    const this_data = req.body;
    console.log("this_data==>", this_data);

    const notification = {
      title: this_data.title,
      send_to: this_data.send_to,
      description: this_data.description,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
    };
    console.log("notification==>", notification);

    db.query(
      "INSERT INTO tarsha_notification SET ?",
      notification,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Notification has been added successfully.",
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
      "SELECT *from `tarsha_notification` WHERE `id`=" +
      parseInt(this_data.id) +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        // const user_id = req?.user?.id;
        const user_id = 1;
        const id = this_data?.id;

        const notification = {
          title: this_data.title,
          send_to: this_data.send_to,
          description: this_data.description,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.id); // Just before the db.query call

        console.log("notification===>", notification);
        const updateSql =
        "UPDATE `tarsha_notification` SET " +
        "`title`='" +
        notification.title +
        "'," +
        "`send_to`='" +
        notification.send_to +
        "'," +
        "`description`='" +
        notification.description +
        "'," +
        "`updated_at`='" +
        notification.updated_at +
        "'," +
        "`updated_by`=" +
        parseInt(notification.updated_by) +
        " WHERE `id`=" +
        id;
    

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Notification has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },

  getnotificationbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql = "SELECT * FROM tarsha_notification WHERE id = ?";

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

  getnotificationlist: async function (req, res) {
    var sql = "SELECT * FROM tarsha_notification";

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
};
