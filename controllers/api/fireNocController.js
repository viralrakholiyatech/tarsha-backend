const {
  unlinkMultipleImages,
  getImageWithFolder,
  getImageWithname,
  unlinkSingleImage,
  getImageWithFoldername
} = require("../../services/FileService");
module.exports = {
  getFireNocFile: async function (req, res) {
    var sql = "select * from  fire_noc where is_deleted = 0";

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
  addorupdate: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    let fireNocReceipt = this_data.fire_noc_receipt || "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "fire_noc_receipt") {
          fireNocReceipt = getImageWithFoldername(file.path);
        } else {
          unlinkSingleImage(getImageWithFoldername(file.path));
        }
      });
    }

    if (!fireNocReceipt && !this_data.id) {
      return res.status(400).json({
        error: true,
        message: "Please upload the receipt.",
        data: {},
      });
    }

    const FireNOC = {
      team_id: this_data.team_id || 1,
      approval_id: this_data.approval_id,
      assign_application_date: this_data.assign_application_date,
      received_application_date: this_data.received_application_date,
      application_number: this_data.application_number,
      fire_noc_receipt: fireNocReceipt,
      created_by: user_id,
      created_at: null,
      updated_at: getCurrentDateAndTime(),
      updated_by: user_id,
      is_deleted: 0,
    };

    const updateTodosIfCompleted = (project_id) => {
      const sql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 1 AND project_name = 4 AND project_id = ?`;

      db.query(sql, [project_id], (err, result) => {
        if (err) {
          console.error("Error fetching file_id:", err);
          return;
        }

        if (result.length > 0) {
          const file_id = result[0].id;
          const updateTodosSql = `
            UPDATE todos 
            SET status = 1, updated_at = ?
            WHERE file_id = ?`;

          db.query(updateTodosSql, [getCurrentDate(), file_id], (err2) => {
            if (err2) console.error("Error updating todos:", err2);
          });
        }
      });
    };

    if (this_data.id) {
      const selectQuery = `
        SELECT assign_application_date, received_application_date, 
               application_number, fire_noc_receipt 
        FROM fire_noc WHERE id = ?`;

      db.query(selectQuery, [this_data.id], function (err, results) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (results.length > 0) {
          const existing = results[0];

          // Fill missing values from existing DB
          const finalAssignDate = FireNOC.assign_application_date || existing.assign_application_date;
          const finalReceivedDate = FireNOC.received_application_date || existing.received_application_date;
          const finalAppNumber = FireNOC.application_number || existing.application_number;
          let finalReceipt = existing.fire_noc_receipt;
          if (this_data.fire_noc_receipt_cleared === "true") {
            finalReceipt = null;
          } else if (fireNocReceipt) {
            finalReceipt = fireNocReceipt;
          }

          FireNOC.assign_application_date = finalAssignDate;
          FireNOC.received_application_date = finalReceivedDate;
          FireNOC.application_number = finalAppNumber;
          FireNOC.fire_noc_receipt = finalReceipt;
  
          if (finalAssignDate && finalReceivedDate && finalAppNumber && finalReceipt) {
            FireNOC.completed_date = getCurrentDate();
          }
        }
  
        const updateQuery = `UPDATE fire_noc SET ? WHERE id = ?`;
  
        db.query(updateQuery, [FireNOC, this_data.id], function (err, result) {
          if (err) {
            return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
          }
  
          if (FireNOC.completed_date && this_data.approval_id) {
            updateTodosIfCompleted(this_data.approval_id);
          }
  
          return res.status(200).json({
            error: false,
            message: "Fire noc has been updated successfully.",
            data: { id: this_data.id },
          });
        });
      });
    } else {
      FireNOC.created_at = getCurrentDateAndTime();
      FireNOC.updated_at = null;
      FireNOC.updated_by = null;
  
      if (
        FireNOC.assign_application_date &&
        FireNOC.received_application_date &&
        FireNOC.application_number &&
        FireNOC.fire_noc_receipt
      ) {
        FireNOC.completed_date = getCurrentDate();
      }
  
      db.query("INSERT INTO fire_noc SET ?", FireNOC, function (err, result) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
        }
  
        if (FireNOC.completed_date && this_data.approval_id) {
          updateTodosIfCompleted(this_data.approval_id);
        }
  
        return res.status(201).json({
          error: false,
          message: "Fire noc has been added successfully.",
          data: { id: result.insertId },
        });
      });
    }
  },  

  // addorupdate: function (req, res) {
  //   if (!req.files || req.files.length === 0) {
  //     return res
  //       .status(400)
  //       .json({ error: true, message: "Please upload the receipt.", data: {} });
  //   }
  
  //   const files = [];
  //   let fireNocReceipt = "";
  
  //   req.files.forEach((file) => {
  //     if (file.fieldname === "fire_noc_receipt") {
  //       fireNocReceipt = getImageWithFoldername(file.path);
  //       files.push(fireNocReceipt);
  //     } else {
  //       unlinkImage(file.path);
  //     }
  //   });
  
  //   const user_id = req.user ? req.user.id : null;
  //   const this_data = req.body;
  
  //   const FireNOC = {
  //     team_id: this_data.team_id || 1,
  //     approval_id: this_data.approval_id,
  //     assign_application_date: this_data.assign_application_date,
  //     received_application_date: this_data.received_application_date,
  //     application_number: this_data.application_number,
  //     fire_noc_receipt: fireNocReceipt,
  //     created_by: user_id,
  //     created_at: null,
  //     updated_at: getCurrentDateAndTime(),
  //     updated_by: user_id,
  //     is_deleted: 0,
  //   };
  
  //   if (this_data.id) {
  //     // First fetch existing record
  //     const selectQuery = `SELECT assign_application_date, received_application_date, application_number, fire_noc_receipt FROM fire_noc WHERE id = ?`;
  
  //     db.query(selectQuery, [this_data.id], function (err, results) {
  //       if (err) {
  //         return res
  //           .status(500)
  //           .json({ error: true, message: err.sqlMessage, data: {} });
  //       }
  
  //       if (results.length > 0) {
  //         const existing = results[0];
  
  //         // Fill missing values from DB if new data not present
  //         const finalAssignDate = FireNOC.assign_application_date || existing.assign_application_date;
  //         const finalReceivedDate = FireNOC.received_application_date || existing.received_application_date;
  //         const finalAppNumber = FireNOC.application_number || existing.application_number;
  //         const finalReceipt = FireNOC.fire_noc_receipt || existing.fire_noc_receipt;
  
  //         // Update FireNOC with filled values
  //         FireNOC.assign_application_date = finalAssignDate;
  //         FireNOC.received_application_date = finalReceivedDate;
  //         FireNOC.application_number = finalAppNumber;
  //         FireNOC.fire_noc_receipt = finalReceipt;
  
  //         // If all are filled, set completed_date
  //         if (
  //           finalAssignDate &&
  //           finalReceivedDate &&
  //           finalAppNumber &&
  //           finalReceipt
  //         ) {
  //           FireNOC.completed_date = getCurrentDate();
  //         }
  //       }
  
  //       const updateQuery = `UPDATE fire_noc SET ? WHERE id = ?`;
  
  //       db.query(updateQuery, [FireNOC, this_data.id], function (err, result) {
  //         if (err) {
  //           return res
  //             .status(500)
  //             .json({ error: true, message: err.sqlMessage, data: {} });
  //         }
  
  //         if (result.affectedRows === 0) {
  //           return res.status(404).json({
  //             error: true,
  //             message: "No record found to update.",
  //             data: {},
  //           });
  //         }
  
  //         return res.status(200).json({
  //           error: false,
  //           message: "Fire noc has been updated successfully.",
  //           data: {
  //             id: this_data.id,
  //           },
  //         });
  //       });
  //     });
  //   } else {
  //     FireNOC.created_at = getCurrentDateAndTime();
  //     FireNOC.updated_at = null;
  //     FireNOC.updated_by = null;
  
  //     // Check all fields before inserting for new record
  //     if (
  //       FireNOC.assign_application_date &&
  //       FireNOC.received_application_date &&
  //       FireNOC.application_number &&
  //       FireNOC.fire_noc_receipt
  //     ) {
  //       FireNOC.completed_date = getCurrentDate();
  //     }
  
  //     db.query("INSERT INTO fire_noc SET ?", FireNOC, function (err, result) {
  //       if (err) {
  //         return res
  //           .status(500)
  //           .json({ error: true, message: err.sqlMessage, data: {} });
  //       }
  
  //       return res.status(201).json({
  //         error: false,
  //         message: "Fire noc has been added successfully.",
  //         data: {
  //           id: result.insertId,
  //         },
  //       });
  //     });
  //   }
  // },
  

  getfireNocbyId: (req, res) => {

    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM fire_noc WHERE is_deleted = 0 AND approval_id = ${id}`;

    // Execute the SQL query
    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res.status(404).json({
            error: true,
            message: "Requested record not found",
            data: {},
          });
        }
      }
    });
  },

  deleteFireNoc: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          fire_noc_receipt: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `fire_noc` SET `fire_noc_receipt` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [
          data.fire_noc_receipt,
          data.updated_at,
          data.updated_by,
          id,
        ];

        db.query(sql, values, (err, result) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else {
            console.log("Result:", result); // Log the result here
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
};
