const {
  unlinkMultipleImages,
  getImageWithFolder,
  getImageWithname,
  unlinkSingleImage,
  getImageWithFoldername,
} = require("../../services/FileService");
module.exports = {
  getenagarPortalin: async function (req, res) {
    var sql = "select * from  e_nagar_mst_input where is_deleted = 0";

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

  addorupdatein: async function (req, res) {
    try {
      const files = [];

      // Process the files and determine which are valid
      req.files.forEach((file) => {
        if (file.fieldname.includes("smc_predcr_drawing")) {
          const drawingPath = getImageWithname(file.path);
          files.push(drawingPath);
        } else {
          // unlinkImage(file.path);
        }
      });

      const user_id = req.user ? req.user.id : null;
      const this_data = req.body;
      const dynamicFields = this_data.dynamicFields;

      const enagarinput = {
        approval_id: this_data.approval_id,
        architecturename: this_data.architectureName,
        developername: this_data.developerName,
        application_upload_date: this_data.applicationUploaddate,
        applicationnumber: this_data.applicationNumber,
        loginId: this_data.loginId,
        password: this_data.password,
        updated_at: new Date(),
        updated_by: user_id,
        is_deleted: 0,
      };

      // Check if the input data has an ID for updating
      if (this_data.id && this_data.id !== "undefined") {
        const updateQuery = `UPDATE e_nagar_mst_input SET ? WHERE id = ?`;
        const result = await db.query(updateQuery, [enagarinput, this_data.id]);

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "No record found to update.",
            data: {},
          });
        }

        // Loop through the dynamicFields array to update or insert drawings
        for (let i = 0; i < dynamicFields.length; i++) {
          const field = dynamicFields[i];
          let predcr_drawing = null;

          // Find the corresponding file for this dynamic field
          const file = req.files && req.files.find(
            (file) => file.fieldname === `dynamicFields[${i}][predcr_drawing]`
          );
          if (file) {
            predcr_drawing = `EnagarInput/${file.filename}`;
          } else if (field.predcr_drawing && typeof field.predcr_drawing === "string") {
            predcr_drawing = field.predcr_drawing;
          }

          if (field.drawing_id && field.drawing_id !== "undefined") {
            // Update existing record
            await db.query(
              `UPDATE e_nagar_input_drawing 
                SET upload_date = ?, predcr_drawing = ?, query = ?, updated_at = ?, updated_by = ?
                WHERE id = ?`,
              [
                field.upload_date,
                predcr_drawing || field.predcr_drawing, // Use new file path if exists, else keep the old one
                field.query,
                new Date(),
                user_id,
                field.drawing_id,
              ]
            );
          } else {
            // If drawing_id is undefined, insert a new record
            if (predcr_drawing) {
              await db.query(
                `INSERT INTO e_nagar_input_drawing 
                  (e_nagar_mst_id, upload_date, predcr_drawing, query, created_by, created_at, updated_at, is_deleted) 
                  VALUES (?, ?, ?, ?, ?, ?, null, 0)`,
                [
                  this_data.id,
                  field.upload_date,
                  predcr_drawing,
                  field.query,
                  user_id,
                  new Date(),
                ]
              );
            } else {
              console.warn(
                `No corresponding file for upload_date: ${field.upload_date}`
              );
            }
          }
        }

        return res.status(200).json({
          error: false,
          message: "E Nagar input has been updated successfully.",
          data: { id: this_data.id },
        });
      } else {
        // Insert a new record
        enagarinput.created_at = new Date();
        enagarinput.created_by = user_id;
        enagarinput.updated_at = null;
        enagarinput.updated_by = null;

        db.query(
          "INSERT INTO e_nagar_mst_input SET ?",
          enagarinput,
          (error, results) => {
            if (error) {
              console.error("Insert Error:", error);
              return res
                .status(500)
                .json({ error: true, message: "Failed to insert data." });
            }

            const enagarId = results.insertId;

            const insertEnagarsQuery = `
              INSERT INTO e_nagar_input_drawing 
                (e_nagar_mst_id, upload_date, predcr_drawing, query, created_by, created_at, updated_at, is_deleted) 
                VALUES ?`;

            const EnagarValues = [];

            dynamicFields.forEach((field, index) => {
              const file = req.files && req.files.find(
                (f) => f.fieldname === `dynamicFields[${index}][predcr_drawing]`
              );
              let drawing = file ? `EnagarInput/${file.filename}` : (field.predcr_drawing || null);
              EnagarValues.push([
                enagarId,
                field.upload_date,
                drawing,
                field.query,
                user_id,
                new Date(),
                null,
                0,
              ]);
            });

            db.query(insertEnagarsQuery, [EnagarValues], (insertError) => {
              if (insertError) {
                console.error("Insert Drawing Error:", insertError);
                return res.status(500).json({
                  error: true,
                  message: "Failed to insert drawing data.",
                });
              }

              return res.status(201).json({
                error: false,
                message: "E Nagar input drawing inserted successfully",
                data: { project_id: enagarId },
              });
            });
          }
        );
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({
        error: true,
        message: "An error occurred while processing your request.",
        data: {},
      });
    }
  },
  addorupdateout: async function (req, res) {
    try {
      const files = [];
      const user_id = req.user ? req.user.id : null;
      const this_data = req.body;
      let smcdrawing = this_data.smc_predcr_drawing || "";
      let permissionletter = this_data.perimissionletter || this_data.permissionletter || "";

      // Process uploaded files
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (file.fieldname === "smc_predcr_drawing") {
            smcdrawing = getImageWithFoldername(file.path);
            files.push(smcdrawing);
          } else if (file.fieldname === "perimissionletter" || file.fieldname === "permissionletter") {
            permissionletter = getImageWithFoldername(file.path);
            files.push(permissionletter);
          } else {
            unlinkSingleImage(getImageWithFoldername(file.path));
          }
        });
      }
      const smcFields = this_data.smcFields;
  
      let enagarout = {
        approval_id: this_data.approval_id,
        smcassign_application: this_data.smc_assign_application,
        updated_at: new Date(),
        updated_by: user_id,
        is_deleted: 0,
      };
  
      const updateTodosIfComplete = (project_id) => {
        const fileQuery = `
          SELECT id FROM new_mst_file_details 
          WHERE source_type = 1 AND project_name = 3 AND project_id = ?`;
  
        db.query(fileQuery, [project_id], (err, result) => {
          if (err) return console.error("Error selecting file_id:", err);
          if (result.length > 0) {
            const file_id = result[0].id;
            const updateQuery = `
              UPDATE todos 
              SET status = 1, updated_at = ? 
              WHERE file_id = ?`;
  
            db.query(updateQuery, [new Date(), file_id], (err2) => {
              if (err2) console.error("Error updating todos:", err2);
            });
          }
        });
      };
  
      if (this_data.id && this_data.id !== "undefined") {
        const existingRecordQuery = `
          SELECT smc_checker_predcrdrawing, permissionletter 
          FROM e_nagar_mst_output WHERE id = ?`;
  
        db.query(existingRecordQuery, [this_data.id], async (err, result) => {
          if (err) {
            return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
          }
  
          if (result.length === 0) {
            return res.status(404).json({ error: true, message: "No record found to update.", data: {} });
          }
  
          // Keep old files if new not uploaded
          if (this_data.smc_predcr_drawing_cleared === "true") {
            enagarout.smc_checker_predcrdrawing = null;
          } else {
            enagarout.smc_checker_predcrdrawing = smcdrawing || result[0].smc_checker_predcrdrawing;
          }

          if (this_data.permissionletter_cleared === "true" || this_data.perimissionletter_cleared === "true") {
            enagarout.permissionletter = null;
          } else {
            enagarout.permissionletter = permissionletter || result[0].permissionletter;
          }

          // If both documents are present, set completed_date
          if (enagarout.smc_checker_predcrdrawing && enagarout.permissionletter) {
            enagarout.completed_date = new Date();
          }
  
          const updateResult = await db.query(
            `UPDATE e_nagar_mst_output SET ? WHERE id = ?`,
            [enagarout, this_data.id]
          );
  
          // Update or insert smcFields
          for (const field of smcFields) {
            if (field.details_id && field.details_id !== "undefined") {
              await db.query(
                `UPDATE e_nagar_output_details 
                 SET status_date = ?, applicationstatus = ?, updated_at = ?, updated_by = ? 
                 WHERE id = ?`,
                [field.statusdate, field.applicationstatus, new Date(), user_id, field.details_id]
              );
            } else {
              await db.query(
                `INSERT INTO e_nagar_output_details 
                 (e_nagar_output_mst_id, status_date, applicationstatus, created_by, created_at, updated_at, is_deleted) 
                 VALUES (?, ?, ?, ?, ?, null, 0)`,
                [this_data.id, field.statusdate, field.applicationstatus, user_id, new Date()]
              );
            }
          }
  
          if (enagarout.completed_date && this_data.approval_id) {
            updateTodosIfComplete(this_data.approval_id);
          }
  
          return res.status(200).json({
            error: false,
            message: "E Nagar output and details have been updated successfully.",
            data: { id: this_data.id },
          });
        });
      } else {
        // Insertion logic
        enagarout.smc_checker_predcrdrawing = smcdrawing || null;
        enagarout.permissionletter = permissionletter || null;
        enagarout.smcassign_application;
        enagarout.created_at = new Date();
        enagarout.created_by = user_id;
        enagarout.updated_at = null;
        enagarout.updated_by = null;
  
        // If both documents are present, set completed_date
        if (enagarout.smc_checker_predcrdrawing && enagarout.permissionletter) {
          enagarout.completed_date = new Date();
        }
  
        db.query("INSERT INTO e_nagar_mst_output SET ?", enagarout, (error, results) => {
          if (error) {
            console.error("Insert Error:", error);
            return res.status(500).json({ error: true, message: "Failed to insert data." });
          }
  
          const enagarId = results.insertId;
          const insertDetailsQuery = `
            INSERT INTO e_nagar_output_details 
            (e_nagar_output_mst_id, status_date, applicationstatus, created_by, created_at, updated_at, is_deleted) 
            VALUES ?`;
          const EnagarValues = smcFields.map(field => [
            enagarId,
            field.statusdate,
            field.applicationstatus,
            user_id,
            new Date(),
            null,
            0,
          ]);
  
          db.query(insertDetailsQuery, [EnagarValues], (insertError) => {
            if (insertError) {
              console.error("Insert details Error:", insertError);
              return res.status(500).json({ error: true, message: "Failed to insert details data." });
            }
  
            if (enagarout.completed_date && this_data.approval_id) {
              updateTodosIfComplete(this_data.approval_id);
            }
  
            return res.status(201).json({
              error: false,
              message: "E Nagar output and details inserted successfully",
              data: { project_id: enagarId },
            });
          });
        });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({
        error: true,
        message: "An error occurred while processing your request.",
        data: {},
      });
    }
  },
  

  // addorupdateout: async function (req, res) {
  //   try {
  //     const files = [];
  //     let smcdrawing = "";
  //     let permissionletter = "";

  //     // Process uploaded files
  //     req.files.forEach((file) => {
  //       if (file.fieldname === "smc_predcr_drawing") {
  //         smcdrawing = getImageWithFoldername(file.path);
  //         files.push(smcdrawing);
  //       } else if (file.fieldname === "perimissionletter") {
  //         permissionletter = getImageWithFoldername(file.path);
  //         files.push(permissionletter);
  //       } else {
  //         unlinkImage(file.path);
  //       }
  //     });

  //     const user_id = req.user ? req.user.id : null;
  //     const this_data = req.body;
  //     const smcFields = this_data.smcFields;

  //     let enagarout = {
  //       approval_id: this_data.approval_id,
  //       smcassign_application: this_data.smc_assign_application,
  //       updated_at: new Date(),
  //       updated_by: user_id,
  //       is_deleted: 0,
  //     };

  //     // Database operations
  //     if (this_data.id && this_data.id !== "undefined") {
      
  //       const existingRecordQuery = `SELECT smc_checker_predcrdrawing, permissionletter FROM e_nagar_mst_output WHERE id = ?`;
  //       db.query(existingRecordQuery, [this_data.id], async (err, result) => {
  //         if (err) {
  //           return res
  //             .status(500)
  //             .json({ error: true, message: err.sqlMessage, data: {} });
  //         }

  //         if (result.length === 0) {
  //           return res.status(404).json({
  //             error: true,
  //             message: "No record found to update.",
  //             data: {},
  //           });
  //         }

  //         // Use the new file if available, otherwise, use the existing one
  //         enagarout.smc_checker_predcrdrawing = smcdrawing
  //           ? smcdrawing
  //           : result[0].smc_checker_predcrdrawing; // Use result[0]
  //         enagarout.permissionletter = permissionletter
  //           ? permissionletter
  //           : result[0].permissionletter; // Use result[0]

  //         // Update existing record
  //         const updateResult = await db.query(
  //           `UPDATE e_nagar_mst_output SET ? WHERE id = ?`,
  //           [enagarout, this_data.id]
  //         );

  //         if (updateResult.affectedRows === 0) {
  //           return res.status(404).json({
  //             error: true,
  //             message: "No record found to update.",
  //             data: {},
  //           });
  //         }

  //         // Update or insert smcFields
  //         for (const field of smcFields) {
  //           if (field.details_id && field.details_id !== "undefined") {
  //             // Update existing e_nagar_output_details
  //             await db.query(
  //               `UPDATE e_nagar_output_details 
  //                       SET status_date = ?, applicationstatus = ?, updated_at = ?, updated_by = ?
  //                       WHERE id = ?`,
  //               [
  //                 field.statusdate,
  //                 field.applicationstatus,
  //                 new Date(),
  //                 user_id,
  //                 field.details_id,
  //               ]
  //             );
  //           } else {
  //             // Insert new e_nagar_output_details
  //             await db.query(
  //               `INSERT INTO e_nagar_output_details 
  //                       (e_nagar_output_mst_id, status_date, applicationstatus, created_by, created_at, updated_at, is_deleted) 
  //                       VALUES (?, ?, ?, ?, ?, null, 0)`,
  //               [
  //                 this_data.id,
  //                 field.statusdate,
  //                 field.applicationstatus,
  //                 user_id,
  //                 new Date(),
  //               ]
  //             );
  //           }
  //         }

  //         return res.status(200).json({
  //           error: false,
  //           message:
  //             "E Nagar output and details have been updated successfully.",
  //           data: { id: this_data.id },
  //         });
  //       });
  //     } else {
  //       // Insert new record
  //       enagarout.smc_checker_predcrdrawing = smcdrawing ? smcdrawing : null; // Add fallback
  //       enagarout.permissionletter = permissionletter ? permissionletter : null; // Add fallback
  //       enagarout.created_at = new Date();
  //       enagarout.created_by = user_id;
  //       enagarout.updated_at = null;
  //       enagarout.updated_by = null;

  //       db.query(
  //         "INSERT INTO e_nagar_mst_output SET ?",
  //         enagarout,
  //         (error, results) => {
  //           if (error) {
  //             console.error("Insert Error:", error);
  //             return res
  //               .status(500)
  //               .json({ error: true, message: "Failed to insert data." });
  //           }

  //           const enagarId = results.insertId;

  //           // Insert smcFields into e_nagar_output_details
  //           const insertEnagarsQuery = `
  //                       INSERT INTO e_nagar_output_details 
  //                       (e_nagar_output_mst_id, status_date, applicationstatus, created_by, created_at, updated_at, is_deleted) 
  //                       VALUES ?
  //                     `;
  //           const EnagarValues = [];

  //           smcFields.forEach((field) => {
  //             EnagarValues.push([
  //               enagarId, // Use the captured insertId
  //               field.statusdate,
  //               field.applicationstatus,
  //               user_id,
  //               new Date(),
  //               null,
  //               0,
  //             ]);
  //           });

  //           db.query(insertEnagarsQuery, [EnagarValues], (insertError) => {
  //             if (insertError) {
  //               console.error("Insert details Error:", insertError);
  //               return res.status(500).json({
  //                 error: true,
  //                 message: "Failed to insert details data.",
  //               });
  //             }

  //             return res.status(201).json({
  //               error: false,
  //               message: "E Nagar output and details inserted successfully",
  //               data: { project_id: enagarId },
  //             });
  //           });
  //         }
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Error processing request:", error);
  //     return res.status(500).json({
  //       error: true,
  //       message: "An error occurred while processing your request.",
  //       data: {},
  //     });
  //   }
  // },

  getenagarInputbyId: (req, res) => {

    const id = parseInt(req.params.id);

    const sql = `
    select enmi.id,enmi.architecturename,enmi.developername,enmi.application_upload_date,enmi.applicationnumber,enmi.loginId,enmi.password,enid.id as enid_id,enid.upload_date,enid.predcr_drawing,enid.query from e_nagar_mst_input as enmi
left join e_nagar_input_drawing as enid
on enid.e_nagar_mst_id = enmi.id
where enmi.approval_id = ? and enid.is_deleted = 0
  `;

    // Execute the SQL query
    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        // Get the base data from the first result
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
          drawings: [], // Initialize an array for drawings
        };

        // Loop through results to gather drawing data
        result.forEach((row) => {
          baseData.drawings.push({
            drawing_id: row.enid_id,
            upload_date: row.upload_date,
            predcr_drawing: row.predcr_drawing,
            query: row.query,
          });
        });

        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: baseData });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requested record not found",
          data: {},
        });
      }
    });
  },

  getenagarOutputbyId: (req, res) => {
    const id = parseInt(req.params.id);

    const sql = `
       select enmo.id,enmo.smcassign_application,enmo.smc_checker_predcrdrawing,enmo.permissionletter,enod.id as details_id,enod.status_date,enod.applicationstatus from e_nagar_mst_output as enmo
left join e_nagar_output_details as enod
on enod.e_nagar_output_mst_id = enmo.id
where enmo.approval_id = ? and enod.is_deleted = 0
  `;

    // Execute the SQL query
    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        // Get the base data from the first result
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
          details: [], // Initialize an array for drawings
        };

        // Loop through results to gather drawing data
        result.forEach((row) => {
          baseData.details.push({
            details_id: row.details_id,
            status_date: row.status_date,
            applicationstatus: row.applicationstatus,
            query: row.query,
          });
        });

        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: baseData });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requested record not found",
          data: {},
        });
      }
    });
  },

  deleteInputdrawing: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          predcr_drawing: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `e_nagar_input_drawing` SET `predcr_drawing` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [
          data.predcr_drawing,
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

  deletesmcdrawing: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          smc_checker_predcrdrawing: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `e_nagar_mst_output` SET `smc_checker_predcrdrawing` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [
          data.smc_checker_predcrdrawing,
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

  deletepermissionletter: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          permissionletter: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `e_nagar_mst_output` SET `permissionletter` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [
          data.permissionletter,
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
  deleteenagardetails: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          is_deleted: 1, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `e_nagar_output_details` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

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
  deleteenagardrwaing: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          is_deleted: 1, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `e_nagar_input_drawing` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

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
