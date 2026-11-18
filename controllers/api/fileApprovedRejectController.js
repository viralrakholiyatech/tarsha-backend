const notificationController = require("./notificationController");
const table_name = "approved";
module.exports = {
  save_file_approved_reject: (req, res) => {
    try {
      const data = {
        mst_file_id: req.body?.mst_file_id,
        status: req.body?.status,
      };

      var sql =
        "SELECT `id` FROM `status_file` WHERE UPPER(`status_file_name`)=UPPER('" +
        data?.status +
        "') and UPPER(`types`)=UPPER('Status')";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          const updatedData = {
            status: result[0]?.id,
            updated_at: getCurrentDateAndTime(),
            updated_by: req.user?.id,
          };

          var sql =
            "UPDATE `mst_file` SET ? WHERE `id`=" + data.mst_file_id + "";

          db.query(sql, updatedData, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              /*Sending notification*/
              notificationController.setNotification(
                JSON.stringify({
                  message: `approved by ${updatedData?.updated_by} `,
                  mst_file_id:mst_file_id}),
             
                table_name
              );
              res
                .status(200)
                .json({
                  message: "File status updated",
                  error: false,
                  data: {},
                });
            }
          });
        } else {
          res
            .status(200)
            .json({ message: "Unable to make changes", data: {}, error: true });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
};
