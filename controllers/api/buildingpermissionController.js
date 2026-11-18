const {
  unlinkMultipleImages,
  getImageWithFolder,
  getImageWithname,
  unlinkSingleImage,
  getImageWithFoldername,
} = require("../../services/FileService");
module.exports = {
  getinwardData: async function (req, res) {
    var sql = "select * from  inward_details where is_deleted = 0";

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
    const files = [];
    const this_data = req.body;
    let scrunityFees = this_data.scrunityfees || this_data.scruityfees || "";
    let roadDeposit = this_data.roaddeposit || "";
    const user_id = req.user ? req.user.id : null;

    if (this_data.id) {
      const fetchExistingQuery = `SELECT scruityfees, roaddeposit FROM inward_details WHERE id = ?`;

      db.query(fetchExistingQuery, [this_data.id], function (err, result) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage });
        }

        if (result.length === 0) {
          return res
            .status(404)
            .json({ error: true, message: "No record found." });
        }

        let existingData = result[0];
        if (this_data.scrunityfees_cleared === "true" || this_data.scruityfees_cleared === "true") {
          scrunityFees = "";
        } else if (!scrunityFees) {
          scrunityFees = existingData.scruityfees || "";
        }

        if (this_data.roaddeposit_cleared === "true") {
          roadDeposit = "";
        } else if (!roadDeposit) {
          roadDeposit = existingData.roaddeposit || "";
        }

        // Process uploaded files
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => {
            if (file.fieldname === "scrunityfees") {
              scrunityFees = getImageWithFoldername(file.path);
              files.push(scrunityFees);
            } else if (file.fieldname === "roaddeposit") {
              roadDeposit = getImageWithFoldername(file.path);
              files.push(roadDeposit);
            } else {
              unlinkSingleImage(getImageWithFoldername(file.path));
            }
          });
        }

        const inwardData = {
          approval_id: this_data.approval_id,
          application_inward: this_data.application_inward,
          scruityfees: scrunityFees,
          roaddeposit: roadDeposit,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
          is_deleted: 0,
        };

        const updateQuery = `UPDATE inward_details SET ? WHERE id = ?`;

        db.query(
          updateQuery,
          [inwardData, this_data.id],
          function (err, result) {
            if (err) {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage });
            }

            if (result.affectedRows === 0) {
              return res
                .status(404)
                .json({ error: true, message: "No record found to update." });
            }

            return res.status(200).json({
              error: false,
              message: "Inward Details has been updated successfully.",
              data: { id: this_data.id },
            });
          }
        );
      });
    } else {
      // If inserting a new record
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (file.fieldname === "scrunityfees") {
            scrunityFees = getImageWithFoldername(file.path);
            files.push(scrunityFees);
          } else if (file.fieldname === "roaddeposit") {
            roadDeposit = getImageWithFoldername(file.path);
            files.push(roadDeposit);
          } else {
            unlinkSingleImage(getImageWithFoldername(file.path));
          }
        });
      }

      const inwardData = {
        approval_id: this_data.approval_id,
        application_inward: this_data.application_inward,
        scruityfees: scrunityFees,
        roaddeposit: roadDeposit,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query(
        "INSERT INTO inward_details SET ?",
        inwardData,
        function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage });
          }

          return res.status(201).json({
            error: false,
            message: "Inward Details has been added successfully.",
            data: { id: result.insertId },
          });
        }
      );
    }
  },

  getInwardDetailsbyId: (req, res) => {
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM inward_details WHERE is_deleted = 0 AND approval_id = ${id}`;

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
  deleteRoadDeposit: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          roaddeposit: null,
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `inward_details` SET `roaddeposit` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [data.roaddeposit, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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
  deleteScrunityFile: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          scruityfees: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `inward_details` SET `scruityfees` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [data.scruityfees, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  addupdateouteward: function (req, res) {
    const files = [];
    const this_data = req.body;
    let buildingLetter = this_data.building_letter || "";
    let approvePlan = this_data.approve_Plan || this_data.approval_plan || "";
    const user_id = req.user ? req.user.id : null;
  
    const updateTodosIfComplete = (project_id) => {
      const fileQuery = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 1 AND project_name = 5 AND project_id = ?`;
  
      db.query(fileQuery, [project_id], (err, result) => {
        if (err) return console.error("Error selecting file_id:", err);
        if (result.length > 0) {
          const file_id = result[0].id;
          const updateQuery = `
            UPDATE todos 
            SET status = 1, updated_at = ? 
            WHERE file_id = ?`;
  
          db.query(updateQuery, [getCurrentDateAndTime(), file_id], (err2) => {
            if (err2) console.error("Error updating todos:", err2);
          });
        }
      });
    };
  
    if (this_data.id) {
      const fetchExistingQuery = `SELECT building_letter, approval_plan FROM outward_details WHERE id = ?`;
  
      db.query(fetchExistingQuery, [this_data.id], function (err, result) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage });
        }
  
        if (result.length === 0) {
          return res.status(404).json({ error: true, message: "No record found." });
        }
  
        let existingData = result[0];
        if (this_data.building_letter_cleared === "true") {
          buildingLetter = "";
        } else if (!buildingLetter) {
          buildingLetter = existingData.building_letter || "";
        }

        if (this_data.approval_plan_cleared === "true" || this_data.approve_Plan_cleared === "true") {
          approvePlan = "";
        } else if (!approvePlan) {
          approvePlan = existingData.approval_plan || "";
        }
  
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => {
            if (file.fieldname === "building_letter") {
              buildingLetter = getImageWithFoldername(file.path);
              files.push(buildingLetter);
            } else if (file.fieldname === "approve_Plan" || file.fieldname === "approval_plan") {
              approvePlan = getImageWithFoldername(file.path);
              files.push(approvePlan);
            } else {
              unlinkSingleImage(getImageWithFoldername(file.path));
            }
          });
        }
  
        const outward = {
          approval_id: this_data.approval_id,
          building_date: this_data.building_date,
          approval_date: this_data.approve_date,
          building_letter: buildingLetter,
          approval_plan: approvePlan,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
          is_deleted: 0,
        };
  
        if (buildingLetter && approvePlan) {
          outward.completed_date = getCurrentDateAndTime();
        }
  
        const updateQuery = `UPDATE outward_details SET ? WHERE id = ?`;
  
        db.query(updateQuery, [outward, this_data.id], function (err, result) {
          if (err) {
            return res.status(500).json({ error: true, message: err.sqlMessage });
          }
  
          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "No record found to update.",
            });
          }
  
          if (outward.completed_date && this_data.approval_id) {
            updateTodosIfComplete(this_data.approval_id);
          }
  
          return res.status(200).json({
            error: false,
            message: "Outward details have been updated successfully.",
            data: { id: this_data.id },
          });
        });
      });
    } else {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (file.fieldname === "building_letter") {
            buildingLetter = getImageWithFoldername(file.path);
            files.push(buildingLetter);
          } else if (file.fieldname === "approve_Plan" || file.fieldname === "approval_plan") {
            approvePlan = getImageWithFoldername(file.path);
            files.push(approvePlan);
          } else {
            unlinkSingleImage(getImageWithFoldername(file.path));
          }
        });
      }
  
      const outward = {
        approval_id: this_data.approval_id,
        building_date: this_data.building_date,
        approval_date: this_data.approval_date?.trim() !== "" ? this_data.approval_date : null,
        building_letter: buildingLetter,
        approval_plan: approvePlan,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };
  
      if (buildingLetter && approvePlan) {
        outward.completed_date = getCurrentDateAndTime();
      }
  
      db.query("INSERT INTO outward_details SET ?", outward, function (err, result) {
        if (err) {
          return res.status(500).json({ error: true, message: err.sqlMessage });
        }
  
        if (outward.completed_date && this_data.approval_id) {
          updateTodosIfComplete(this_data.approval_id);
        }
  
        return res.status(201).json({
          error: false,
          message: "Outward has been added successfully.",
          data: { id: result.insertId },
        });
      });
    }
  },
  



  getoutewardbyId: (req, res) => {
    // Access and parse the id from the request params
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM outward_details WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  deleteBuildingletter: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          building_letter: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `outward_details` SET `building_letter` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [
          data.building_letter,
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
  deleteApprovalplan: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          approval_plan: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `outward_details` SET `approval_plan` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [
          data.approval_plan,
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
  addorupdateApproval: async function (req, res) {
  // promise wrapper so queries run one after another
  const q = (sql, params = []) =>
    new Promise((resolve, reject) =>
      db.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)))
    );

  const uploadedPaths = [];

  try {
    // 1. Map uploaded files to stage index
    const fileMap = {};
    (req.files || []).forEach((file) => {
      const m = file.fieldname.match(/^stages\[(\d+)\]\[approved_letter\]$/);
      if (m) {
        fileMap[m[1]] = getImageWithFoldername(file.path);
        uploadedPaths.push(file.path);
      } else {
        unlinkImage(file.path);
      }
    });

    // 2. Validate
    const user_id = req.user ? req.user.id : null;
    const stages = req.body.stages;

    if (!Array.isArray(stages) || stages.length === 0) {
      uploadedPaths.forEach(unlinkImage);
      return res.status(400).json({
        error: true,
        message: "Invalid data format. 'stages' should be an array.",
      });
    }

    // 3. Process each stage in order
    for (let index = 0; index < stages.length; index++) {
      const stage = stages[index];

      const date =
        stage.date && String(stage.date).trim() !== "" ? stage.date : null;
      const status = stage.status || "";
      const queryText = stage.query || "";
      const newLetter =
        fileMap[index] ||
        (stage.approved_letter &&
        typeof stage.approved_letter === "string" &&
        (stage.approved_letter.startsWith("http") ||
          stage.approved_letter.includes(".amazonaws.com/"))
          ? stage.approved_letter
          : null);
      const hasId = stage.id && String(stage.id).trim() !== "";

      // Look up by id only (created_by in the lookup caused duplicate inserts)
      let existing = [];
      if (hasId) {
        existing = await q(
          `SELECT id, approved_letter FROM approval_process WHERE id = ?`,
          [stage.id]
        );
      } else {
        // No id sent: check for an existing row for this approval + level
        existing = await q(
          `SELECT id, approved_letter FROM approval_process
           WHERE approval_id = ? AND level = ? AND is_deleted = 0
           LIMIT 1`,
          [stage.approval_id, stage.level]
        );
      }

      if (existing.length > 0) {
        // UPDATE: keep the old letter unless a new file was uploaded
        const approved_letter =
          stage.approved_letter_cleared === "true"
            ? null
            : newLetter || existing[0].approved_letter;

        await q(
          `UPDATE approval_process
           SET date = ?, status = ?, query = ?, approved_letter = ?,
               updated_at = NOW(), is_deleted = 0
           WHERE id = ?`,
          [date, status, queryText, approved_letter, existing[0].id]
        );
      } else {
        // INSERT
        const approved_letter = newLetter || stage.approved_letter || null;
        await q(
          `INSERT INTO approval_process
           (approval_id, level, date, status, query, approved_letter,
            created_by, created_at, updated_at, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)`,
          [
            stage.approval_id,
            stage.level,
            date,
            status,
            queryText,
            newLetter,
            user_id,
          ]
        );
      }
    }

    // 4. Respond only after every query has finished
    return res.status(200).json({
      error: false,
      message: "Approval processed successfully",
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    uploadedPaths.forEach(unlinkImage); // remove orphan uploads on failure
    return res.status(500).json({
      error: true,
      message: "Error processing approval",
    });
  }
},


  getApprovalbyId: (req, res) => {
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM approval_process WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  deleteApprovedLetter: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          approved_letter: null,
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `approval_process` SET `approved_letter` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [
          data.approved_letter,
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

  addorupdateallfees: function (req, res) {
    const files = {};
    (req.files || []).forEach((file) => {
      const indexMatch = file.fieldname.match(
        /dynamicFields\[(\d+)\]\.file_upload/
      );
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        const drawingPath = getImageWithFoldername(file.path);
        files[index] = drawingPath;
      } else {
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    let dynamicFields = req.body.dynamicFields || [];
    if (typeof dynamicFields === "string") {
      try { dynamicFields = JSON.parse(dynamicFields); } catch(e){}
    } else if (!Array.isArray(dynamicFields) && typeof dynamicFields === "object") {
      dynamicFields = Object.values(dynamicFields);
    }
    const operations = (dynamicFields || []).map((field, index) => {
      const fileUploadPath =
        files[index] ||
        (field.file_upload &&
        typeof field.file_upload === "string" &&
        (field.file_upload.startsWith("http") ||
          field.file_upload.includes(".amazonaws.com/"))
          ? field.file_upload
          : null);
      if (
        field.AllfeesId &&
        field.AllfeesId !== "undefined" &&
        field.AllfeesId !== ""
      ) {
        return new Promise((resolve, reject) => {
          const existingFileQuery = `
                SELECT file_upload FROM all_important_fees WHERE id = ?`;

          db.query(existingFileQuery, [field.AllfeesId], (err, results) => {
            if (err) {
              console.error("Error fetching existing file:", err);
              return reject(err);
            }
            const existingFile =
              results.length > 0 ? results[0].file_upload : null;
            const finalFilePath =
              field.file_upload_cleared === "true"
                ? null
                : fileUploadPath || existingFile;
            const updateQuery = `
                    UPDATE all_important_fees
                    SET
                      approval_id = ?,
                      receipt_no = ?,
                      fee_type = ?,
                      amount = ?,
                      date = ?,
                      file_upload = ?,
                      updated_by = ?,
                      updated_at = ?
                    WHERE id = ?`;
            const updateValues = [
              field.approval_id,
              field.receipt_no,
              field.fee_type,
              field.amount,
              field.date,
              finalFilePath,
              user_id,
              getCurrentDateAndTime(),
              field.AllfeesId,
            ];
            db.query(updateQuery, updateValues, (err) => {
              if (err) {
                console.error("Error updating All fees:", err);
                return reject(err);
              }
              resolve();
            });
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          const insertQuery = `
                INSERT INTO all_important_fees (
                   approval_id, receipt_no, fee_type, amount, date, file_upload, created_by, created_at, is_deleted
                ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          const insertValues = [
            field.approval_id,
            field.receipt_no,
            field.fee_type,
            field.amount,
            field.date,
            fileUploadPath || null,
            user_id,
            getCurrentDateAndTime(),
            0,
          ];
          db.query(insertQuery, insertValues, (err) => {
            if (err) {
              console.error("Error inserting All fees:", err);
              return reject(err);
            }
            resolve();
          });
        });
      }
    });
    Promise.all(operations)
      .then(() => {
        res.status(201).json({
          error: false,
          message: "All fees processed successfully",
          data: {},
        });
      })
      .catch((error) => {
        console.error("Error in processing All fees:", error);
        res.status(500).json({
          error: true,
          message: "Failed to process All fees",
          data: {},
        });
      });
  },

  getAllfeesbyId: (req, res) => {
    // Access and parse the id from the request params
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM all_important_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  deletefileupload: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          file_upload: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `all_important_fees` SET `file_upload` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.file_upload, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  deleteallfees: (req, res) => {
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
          "UPDATE `all_important_fees` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  getworkfeesbyId: (req, res) => {
    // Access and parse the id from the request params
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM work_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  deleteworkfees: (req, res) => {
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
          "UPDATE `work_fees` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  deleteworkfileupload: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          file_upload: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `work_fees` SET `file_upload` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.file_upload, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  addorupdateworkfees: function (req, res) {
    const files = {};
    (req.files || []).forEach((file) => {
      const indexMatch = file.fieldname.match(
        /workFields\[(\d+)\]\.file_upload/
      );
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        const drawingPath = getImageWithFoldername(file.path);
        files[index] = drawingPath;
      } else {
        unlinkSingleImage(getImageWithFoldername(file.path));
      }
    });

    const user_id = req.user ? req.user.id : null;
    let dynamicFields = req.body.workFields || [];
    if (typeof dynamicFields === "string") {
      try { dynamicFields = JSON.parse(dynamicFields); } catch(e){}
    } else if (!Array.isArray(dynamicFields) && typeof dynamicFields === "object") {
      dynamicFields = Object.values(dynamicFields);
    }
    const operations = (dynamicFields || []).map((field, index) => {
      const fileUploadPath =
        files[index] ||
        (field.file_upload &&
        typeof field.file_upload === "string" &&
        (field.file_upload.startsWith("http") ||
          field.file_upload.includes(".amazonaws.com/"))
          ? field.file_upload
          : null);

      if (
        field.workfeesId &&
        field.workfeesId !== "undefined" &&
        field.workfeesId !== ""
      ) {
        // Prepare the UPDATE query
        return new Promise((resolve, reject) => {
          const existingFileQuery = `
                    SELECT file_upload FROM work_fees WHERE id = ?`;

          db.query(existingFileQuery, [field.workfeesId], (err, results) => {
            if (err) {
              console.error("Error fetching existing file:", err);
              return reject(err);
            }

            // If no new file is uploaded, use the existing file
            const existingFile =
              results.length > 0 ? results[0].file_upload : null;
            const finalFilePath =
              field.file_upload_cleared === "true"
                ? null
                : fileUploadPath || existingFile;

            const updateQuery = `
                        UPDATE work_fees
                        SET
                            approval_id = ?,
                            receipt_no = ?,
                            fee_type = ?,
                            amount = ?,
                            date = ?,
                            file_upload = ?,
                            updated_by = ?,
                            updated_at = ?
                        WHERE id = ?`;

            const updateValues = [
              field.approval_id,
              field.receipt_no,
              field.fee_type,
              field.amount,
              field.date,
              finalFilePath,
              user_id,
              getCurrentDateAndTime(),
              field.workfeesId,
            ];
            db.query(updateQuery, updateValues, (err) => {
              if (err) {
                console.error("Error updating All fees:", err);
                return reject(err);
              }
              resolve();
            });
          });
        });
      } else {
        return new Promise((resolve, reject) => {
          const insertQuery = `
                INSERT INTO work_fees (
                 approval_id, receipt_no, fee_type, amount, date, file_upload, created_by, created_at, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

          const insertValues = [
            field.approval_id,
            field.receipt_no,
            field.fee_type,
            field.amount,
            field.date,
            fileUploadPath || null,
            user_id,
            getCurrentDateAndTime(),
            0,
          ];
          db.query(insertQuery, insertValues, (err) => {
            if (err) {
              console.error("Error inserting All fees:", err);
              return reject(err);
            }
            resolve();
          });
        });
      }
    });
    Promise.all(operations)
      .then(() => {
        res.status(201).json({
          error: false,
          message: "work fees processed successfully",
          data: {},
        });
      })
      .catch((error) => {
        console.error("Error in processing work fees:", error); // Log the error
        res.status(500).json({
          error: true,
          message: "Failed to process work fees",
          data: {},
        });
      });
  },

  deletefsicfileupload: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          filePath: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `fsirows` SET `filePath` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.filePath, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  deleteIcfileupload: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          filePath: null,
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `icrows` SET `filePath` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.filePath, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  //   addorupdatfsicFees: function (req, res) {
  //     const user_id = req.user ? req.user.id : null;
  //     const files = [];

  //     // Process files
  //     req.files.forEach((file) => {
  //       if (file.fieldname.includes("fsiRows") || file.fieldname.includes("icRows")) {
  //         const drawingPath = getImageWithname(file.path); // Process and get the file path
  //         files.push(drawingPath); // Add file paths to the array
  //       } else {
  //         unlinkImage(file.path); // Remove unnecessary files
  //       }
  //     });

  //     const todayDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  // if (req.body.fsiRows && Array.isArray(req.body.fsiRows)) {
  //   req.body.fsiRows.forEach((row, index) => {
  //     let sql, params;

  //     if (row.fsiId && row.fsiId !== 'undefined') {
  //       // Update existing row if fsiId is defined
  //       sql = `UPDATE fsiRows SET
  //                approval_id = ?,
  //                total_fsi_emi = ?,
  //                total_fsi_amount = ?,
  //                date = ?,
  //                amount = ?,
  //                receivedDate = ?,
  //                filePath = ?,
  //                updated_at = ?,
  //                updated_by = ?
  //              WHERE id = ?`;

  //       params = [
  //         req.body.approval_id,
  //         req.body.fsiamountemi,
  //         req.body.fsiAmount,
  //         row.date,
  //         row.amount,
  //         row.receivedDate,
  //         files[index] || null,
  //         todayDate,
  //         user_id,
  //         row.fsiId, // Existing fsiId
  //       ];
  //     } else {
  //       // Insert new row if fsiId is undefined
  //       sql = `INSERT INTO fsiRows (approval_id, total_fsi_emi, total_fsi_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)
  //              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  //       params = [
  //         req.body.approval_id,
  //         req.body.fsiamountemi,
  //         req.body.fsiAmount,
  //         row.date,
  //         row.amount,
  //         row.receivedDate,
  //         files[index] || null,
  //         todayDate,
  //         user_id,
  //         0,
  //       ];
  //     }

  //     db.query(sql, params, (err, results) => {
  //       if (err) {
  //         console.error("Error inserting/updating fsiRow:", err);
  //         res.status(500).send({ message: "Error inserting/updating fsiRow", error: err });
  //       }
  //     });
  //   });
  // }

  // // Insert or update icRows data
  // if (req.body.icRows && Array.isArray(req.body.icRows)) {
  //   req.body.icRows.forEach((row, index) => {
  //     let sql, params;

  //     if (row.icId && row.icId !== 'undefined') {
  //       // Update existing row if icId is defined
  //       sql = `UPDATE icRows SET
  //                apporval_id = ?,
  //                total_ic_emi = ?,
  //                total_ic_amount = ?,
  //                date = ?,
  //                amount = ?,
  //                receivedDate = ?,
  //                filePath = ?,
  //                updated_at = ?,
  //                updated_by = ?
  //              WHERE id = ?`;

  //       params = [
  //         req.body.approval_id,
  //         req.body.icamountemi,
  //         req.body.icAmount,
  //         row.date,
  //         row.amount,
  //         row.receivedDate,
  //         files[index + req.body.fsiRows.length] || null,
  //         todayDate,
  //         user_id,
  //         row.icId, // Existing icId
  //       ];
  //     } else {
  //       // Insert new row if icId is undefined
  //       sql = `INSERT INTO icRows (apporval_id, total_ic_emi, total_ic_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)
  //              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  //       params = [
  //         req.body.approval_id,
  //         req.body.icamountemi,
  //         req.body.icAmount,
  //         row.date,
  //         row.amount,
  //         row.receivedDate,
  //         files[index + req.body.fsiRows.length] || null,
  //         todayDate,
  //         user_id,
  //         0,
  //       ];
  //     }

  //     db.query(sql, params, (err, results) => {
  //       if (err) {
  //         console.error("Error inserting/updating icRow:", err);
  //         res.status(500).send({ message: "Error inserting/updating icRow", error: err });
  //       }
  //     });
  //   });
  // }

  //     // Respond with success
  //     res.status(200).send({ message: "Files and data processed successfully!" });
  //   },
  addorupdatfsicFees: async function (req, res) {
  const user_id = req.user ? req.user.id : null;

  // Promise wrapper around the callback-style db.query
  const query = (sql, params) =>
    new Promise((resolve, reject) => {
      db.query(sql, params, (err, results) =>
        err ? reject(err) : resolve(results)
      );
    });

  try {
    // Map uploaded files by row index, per section
    // e.g. fieldname "fsiRows[2][file]" -> fsiFiles[2]
    const fsiFiles = {};
    const icFiles = {};

    (req.files || []).forEach((file) => {
      const match = file.fieldname.match(/^(fsiRows|icRows)\D*(\d+)/);

      if (!match) {
        unlinkImage(file.path); // Remove unnecessary files
        return;
      }

      const [, section, idx] = match;
      const savedPath = getImageWithFoldername(file.path);

      if (section === "fsiRows") fsiFiles[idx] = savedPath;
      else icFiles[idx] = savedPath;
    });

    const todayDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    let fsiRows = req.body.fsiRows || [];
    if (typeof fsiRows === "string") {
      try { fsiRows = JSON.parse(fsiRows); } catch(e){}
    } else if (!Array.isArray(fsiRows) && typeof fsiRows === "object") {
      fsiRows = Object.values(fsiRows);
    }

    let icRows = req.body.icRows || [];
    if (typeof icRows === "string") {
      try { icRows = JSON.parse(icRows); } catch(e){}
    } else if (!Array.isArray(icRows) && typeof icRows === "object") {
      icRows = Object.values(icRows);
    }

    // ---------- FSI rows ----------
    for (let index = 0; index < fsiRows.length; index++) {
      const row = fsiRows[index];
      const newFilePath =
        fsiFiles[index] ||
        (row.filePath &&
        typeof row.filePath === "string" &&
        (row.filePath.startsWith("http") ||
          row.filePath.includes(".amazonaws.com/"))
          ? row.filePath
          : null);

      if (row.fsiId && row.fsiId !== "undefined") {
        const updateFilePath =
          row.filePath_cleared === "true"
            ? null
            : newFilePath || row.filePath;
        await query(
          `UPDATE fsirows SET
             approval_id = ?,
             total_fsi_emi = ?,
             total_fsi_amount = ?,
             date = ?,
             amount = ?,
             receivedDate = ?,
             filePath = COALESCE(?, filePath),
             updated_at = ?,
             updated_by = ?
           WHERE id = ?`,
          [
            req.body.approval_id,
            req.body.fsiamountemi,
            req.body.fsiAmount,
            row.date,
            row.amount,
            row.receivedDate,
            updateFilePath,
            todayDate,
            user_id,
            row.fsiId,
          ]
        );
      } else {
        await query(
          `INSERT INTO fsirows
             (approval_id, total_fsi_emi, total_fsi_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.body.approval_id,
            req.body.fsiamountemi,
            req.body.fsiAmount,
            row.date,
            row.amount,
            row.receivedDate,
            newFilePath,
            todayDate,
            user_id,
            0,
          ]
        );
      }
    }

    // ---------- IC rows ----------
    for (let index = 0; index < icRows.length; index++) {
      const row = icRows[index];
      const newFilePath =
        icFiles[index] ||
        (row.filePath &&
        typeof row.filePath === "string" &&
        (row.filePath.startsWith("http") ||
          row.filePath.includes(".amazonaws.com/"))
          ? row.filePath
          : null);

      if (row.icId && row.icId !== "undefined") {
        const updateFilePath =
          row.filePath_cleared === "true"
            ? null
            : newFilePath || row.filePath;
        await query(
          `UPDATE icrows SET
             apporval_id = ?,
             total_ic_emi = ?,
             total_ic_amount = ?,
             date = ?,
             amount = ?,
             receivedDate = ?,
             filePath = COALESCE(?, filePath),
             updated_at = ?,
             updated_by = ?
           WHERE id = ?`,
          [
            req.body.approval_id,
            req.body.icamountemi,
            req.body.icAmount,
            row.date,
            row.amount,
            row.receivedDate,
            updateFilePath,
            todayDate,
            user_id,
            row.icId,
          ]
        );
      } else {
        await query(
          `INSERT INTO icrows
             (apporval_id, total_ic_emi, total_ic_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.body.approval_id,
            req.body.icamountemi,
            req.body.icAmount,
            row.date,
            row.amount,
            row.receivedDate,
            newFilePath,
            todayDate,
            user_id,
            0,
          ]
        );
      }
    }

    return res
      .status(200)
      .send({ message: "Files and data processed successfully!" });
  } catch (err) {
    console.error("Error in addorupdatfsicFees:", err);
    return res
      .status(500)
      .send({ message: "Error processing FSI/IC fees", error: err.message });
  }
},

  // addorupdatfsicFees: function (req, res) {
  //   const user_id = req.user ? req.user.id : null;
  //   const files = [];

  //   console.log("req",req.body)
  //   console.log("file",req.files)

  //   // Process files and store their paths
  //   req.files.forEach((file) => {
  //     if (
  //       file.fieldname.includes("fsiRows") ||
  //       file.fieldname.includes("icRows")
  //     ) {
  //       const drawingPath = getImageWithFoldername(file.path); // Process and get the file path
  //       files.push(drawingPath); // Add file paths to the array
  //     } else {
  //       unlinkImage(file.path); // Remove unnecessary files
  //     }
  //   });

  //   const todayDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  //   // Insert or update fsiRows data
  //   if (req.body.fsiRows && Array.isArray(req.body.fsiRows)) {
  //     req.body.fsiRows.forEach((row, index) => {
  //       let sql, params;

  //       if (row.fsiId && row.fsiId !== "undefined") {
  //         // Fetch the old image from the database before update
  //         const oldImagePathQuery = `SELECT filePath FROM fsirows WHERE id = ?`;
  //         db.query(oldImagePathQuery, [row.fsiId], (err, results) => {
  //           if (err) {
  //             console.error("Error fetching old image:", err);
  //             return res
  //               .status(500)
  //               .send({ message: "Error fetching old image", error: err });
  //           }

  //           const oldImagePath =
  //             results.length > 0 ? results[0].filePath : null;
  //           const filePath = files[index] || oldImagePath; // Use the new image if uploaded, otherwise use old image

  //           // Update existing row if fsiId is defined
  //           sql = `UPDATE fsirows SET 
  //                  approval_id = ?, 
  //                  total_fsi_emi = ?, 
  //                  total_fsi_amount = ?, 
  //                  date = ?, 
  //                  amount = ?, 
  //                  receivedDate = ?, 
  //                  filePath = ?, 
  //                  updated_at = ?, 
  //                  updated_by = ? 
  //                WHERE id = ?`;

  //           params = [
  //             req.body.approval_id,
  //             req.body.fsiamountemi,
  //             req.body.fsiAmount,
  //             row.date,
  //             row.amount,
  //             row.receivedDate,
  //             filePath, // Use new or old image
  //             todayDate,
  //             user_id,
  //             row.fsiId, // Existing fsiId
  //           ];

  //           db.query(sql, params, (err, results) => {
  //             if (err) {
  //               console.error("Error updating fsiRow:", err);
  //               return res
  //                 .status(500)
  //                 .send({ message: "Error updating fsiRow", error: err });
  //             }
  //           });
  //         });
  //       } else {
  //         // Insert new row if fsiId is undefined
  //         sql = `INSERT INTO fsirows (approval_id, total_fsi_emi, total_fsi_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)  
  //              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  //         params = [
  //           req.body.approval_id,
  //           req.body.fsiamountemi,
  //           req.body.fsiAmount,
  //           row.date,
  //           row.amount,
  //           row.receivedDate,
  //           files[index] || null, // Use the new image if uploaded
  //           todayDate,
  //           user_id,
  //           0,
  //         ];

  //         db.query(sql, params, (err, results) => {
  //           if (err) {
  //             console.error("Error inserting fsiRow:", err);
  //             return res
  //               .status(500)
  //               .send({ message: "Error inserting fsiRow", error: err });
  //           }
  //         });
  //       }
  //     });
  //   }

  //   // Insert or update icRows data
  //   if (req.body.icRows && Array.isArray(req.body.icRows)) {
  //     req.body.icRows.forEach((row, index) => {
  //       let sql, params;

  //       if (row.icId && row.icId !== "undefined") {
  //         // Fetch the old image from the database before update
  //         const oldImagePathQuery = `SELECT filePath FROM icrows WHERE id = ?`;
  //         db.query(oldImagePathQuery, [row.icId], (err, results) => {
  //           if (err) {
  //             console.error("Error fetching old image:", err);
  //             return res
  //               .status(500)
  //               .send({ message: "Error fetching old image", error: err });
  //           }

  //           const oldImagePath =
  //             results.length > 0 ? results[0].filePath : null;
  //           const filePath =
  //             files[index + req.body.fsiRows.length] || oldImagePath; // Use the new image if uploaded, otherwise use old image

  //           // Update existing row if icId is defined
  //           sql = `UPDATE icrows SET 
  //                  apporval_id = ?, 
  //                  total_ic_emi = ?, 
  //                  total_ic_amount = ?, 
  //                  date = ?, 
  //                  amount = ?, 
  //                  receivedDate = ?, 
  //                  filePath = ?, 
  //                  updated_at = ?, 
  //                  updated_by = ? 
  //                WHERE id = ?`;

  //           params = [
  //             req.body.approval_id,
  //             req.body.icamountemi,
  //             req.body.icAmount,
  //             row.date,
  //             row.amount,
  //             row.receivedDate,
  //             filePath, // Use new or old image
  //             todayDate,
  //             user_id,
  //             row.icId, // Existing icId
  //           ];

  //           db.query(sql, params, (err, results) => {
  //             if (err) {
  //               console.error("Error updating icRow:", err);
  //               return res
  //                 .status(500)
  //                 .send({ message: "Error updating icRow", error: err });
  //             }
  //           });
  //         });
  //       } else {
  //         // Insert new row if icId is undefined
  //         sql = `INSERT INTO icrows (apporval_id, total_ic_emi, total_ic_amount, date, amount, receivedDate, filePath, created_at, created_by, is_deleted)  
  //              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  //         params = [
  //           req.body.approval_id,
  //           req.body.icamountemi,
  //           req.body.icAmount,
  //           row.date,
  //           row.amount,
  //           row.receivedDate,
  //           files[index + req.body.fsiRows.length] || null, // Use the new image if uploaded
  //           todayDate,
  //           user_id,
  //           0,
  //         ];

  //         db.query(sql, params, (err, results) => {
  //           if (err) {
  //             console.error("Error inserting icRow:", err);
  //             return res
  //               .status(500)
  //               .send({ message: "Error inserting icRow", error: err });
  //           }
  //         });
  //       }
  //     });
  //   }

  //   // Respond with success
  //   res.status(200).send({ message: "Files and data processed successfully!" });
  // },

  getfsicfeesbyId: (req, res) => {
    // Access and parse the id from the request params
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM fsirows WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  geticfeesbyId: (req, res) => {
    // Access and parse the id from the request params
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM icrows WHERE is_deleted = 0 AND apporval_id = ${id}`;

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

  deletefsiData: (req, res) => {
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
          "UPDATE `fsirows` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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

  deleteIcData: (req, res) => {
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
          "UPDATE `icrows` SET `is_deleted` = ?, `updated_at` = ?, `updated_by` = ? WHERE `id` = ?";
        const values = [data.is_deleted, data.updated_at, data.updated_by, id];

        db.query(sql, values, (err, result) => {
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
};
