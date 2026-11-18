  module.exports = {

    add: function (req, res) {
  const user_id = req.user ? req.user.id : null;
  const fileData = req.body;
  const dynamicFields = Array.isArray(req.body.dynamicFields)
    ? req.body.dynamicFields
    : [];
  const caseId = req.body.caseId;

  const isTentative = fileData.tentative_design === "yes";
  const tentativeTypes = Array.isArray(fileData.tentative_types)
    ? fileData.tentative_types
    : [];

  const fileValues = {
    client_id: fileData.client_id,
    company_name: fileData.company_name,
    email: fileData.email,
    phone: fileData.phone,
    project_name: fileData.project_name,
    project_type: fileData.project_type,
    category: fileData.category || null,
    archcategory: fileData.archcategory || null,
    authority: fileData.authority,
    case_id: caseId,
    google_location: fileData.google_location,
    lat: fileData.lat,
    long: fileData.long,
    address: fileData.address,
    land_type: fileData.land_type,
    village: fileData.village,
    city:fileData.city,
    tpscheme: fileData.tpscheme,
    op_no: fileData.op_no,
    fp_no: fileData.fp_no,
    moje: fileData.moje,
    rs_no: fileData.rs_no,
    b_no: fileData.b_no,
    ward_no: fileData.ward_no,
    cs_no: fileData.cs_no,
    file_type: fileData.file_type,
    fire_noc: fileData.fire_noc,
    tentative_design: fileData.tentative_design,
    tentative_types: isTentative ? tentativeTypes.join(",") : null,
    created_by: user_id,
    created_at: getCurrentDateAndTime(),
    updated_at: null,
    is_deleted: 0,
  };

  db.query("INSERT INTO new_mst_file SET ?", fileValues, (err, result) => {
    if (err) {
      console.error("Error inserting File data:", err);
      return res.status(500).json({
        error: true,
        message: "Failed to insert File data",
        data: {},
      });
    }
    const projectId = result.insertId;

    // ── Helper to insert new_mst_file_details rows ──────────────
    const insertFileDetailsQuery = `
      INSERT INTO new_mst_file_details (
        project_id, project_name, assign_to_hod, source_type, created_by, created_at, updated_at, is_deleted
      ) VALUES ?
    `;
    let FileDetailsValue = [];

    // ────────────────────────────────────────────────────────────
    // CASE A: Tentative design = YES
    // No HOD assignments yet. Insert file-details rows derived
    // from the checked tentative_types only.
    // ────────────────────────────────────────────────────────────
    if (isTentative) {
      const hasApprovalProcess = tentativeTypes.includes("approval");
      const hasInteriorDesign = tentativeTypes.includes("interior");
      const hasArchDesign = tentativeTypes.includes("architecture");

      if (hasApprovalProcess) {
        for (let i = 0; i < 5; i++) {
          if (i + 1 === 4 && fileData.fire_noc === "no") continue;
          if (i + 1 === 3 && fileData.file_type === "offline") continue;
          FileDetailsValue.push([
            projectId,
            `${i + 1}`,
            null, // no HOD yet
            1,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }
      if (hasInteriorDesign) {
        for (let i = 1; i <= 8; i++) {
          FileDetailsValue.push([
            projectId,
            `${i}`,
            null,
            3,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }
      if (hasArchDesign) {
        for (let i = 1; i <= 8; i++) {
          FileDetailsValue.push([
            projectId,
            `${i}`,
            null,
            2,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }

      // Skip the dynamicFields insert entirely for tentative files
      if (FileDetailsValue.length > 0) {
        db.query(insertFileDetailsQuery, [FileDetailsValue], (err) => {
          if (err) {
            console.error("Error inserting File details (tentative):", err);
            return res.status(500).json({
              error: true,
              message: "Failed to insert File details",
              data: {},
            });
          }
          return res.status(201).json({
            error: false,
            message: "Tentative file inserted successfully",
            data: { project_id: projectId },
          });
        });
      } else {
        return res.status(201).json({
          error: false,
          message: "Tentative file inserted successfully (no types selected)",
          data: { project_id: projectId },
        });
      }
      return; // important: stop here for tentative branch
    }

    // ────────────────────────────────────────────────────────────
    // CASE B: Tentative design = NO (existing flow)
    // Insert project assignments + file details based on dynamicFields.
    // ────────────────────────────────────────────────────────────
    const insertProjectDetailsQuery = `
      INSERT INTO new_mst_file_project_details (
        project_id, application_name, assign_to_hod, no_of_days,application_date, created_by, created_at, updated_at, is_deleted
      ) VALUES ?
    `;
    const projectDetailsValues = dynamicFields.map((field) => [
      projectId,
      field.project_name,
      field.assign_to_hod,
      field.days,
      field.date,
      user_id,
      getCurrentDateAndTime(),
      null,
      0,
    ]);

    if (projectDetailsValues.length === 0) {
      // nothing to assign and not tentative — just return
      return res.status(201).json({
        error: false,
        message: "File inserted successfully",
        data: { project_id: projectId },
      });
    }

    db.query(insertProjectDetailsQuery, [projectDetailsValues], (err) => {
      if (err) {
        console.error("Error inserting File project details:", err);
        return res.status(500).json({
          error: true,
          message: "Failed to insert File project details",
          data: {},
        });
      }

      const hasApprovalProcess = dynamicFields.some(
        (field) => field.project_name === "approval_process"
      );
      const hasInteriorDesign = dynamicFields.some(
        (field) => field.project_name === "interior_design"
      );
      const hasArchDesign = dynamicFields.some(
        (field) => field.project_name === "architecture_design"
      );

      if (hasApprovalProcess) {
        const approvalField = dynamicFields.find(
          (field) => field.project_name === "approval_process"
        );
        const assign_to_hod = approvalField.assign_to_hod || null;
        for (let i = 0; i < 5; i++) {
          if (i + 1 === 4 && fileData.fire_noc === "no") continue;
          if (i + 1 === 3 && fileData.file_type === "offline") continue;
          FileDetailsValue.push([
            projectId,
            `${i + 1}`,
            assign_to_hod,
            1,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }
      if (hasInteriorDesign) {
        const interiorField = dynamicFields.find(
          (field) => field.project_name === "interior_design"
        );
        const assign_to_hod = interiorField.assign_to_hod || null;
        for (let i = 1; i <= 8; i++) {
          FileDetailsValue.push([
            projectId,
            `${i}`,
            assign_to_hod,
            3,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }
      if (hasArchDesign) {
        const ArchField = dynamicFields.find(
          (field) => field.project_name === "architecture_design"
        );
        const assign_to_hod = ArchField.assign_to_hod || null;
        for (let i = 1; i <= 8; i++) {
          FileDetailsValue.push([
            projectId,
            `${i}`,
            assign_to_hod,
            2,
            user_id,
            getCurrentDateAndTime(),
            null,
            0,
          ]);
        }
      }

      if (FileDetailsValue.length > 0) {
        db.query(insertFileDetailsQuery, [FileDetailsValue], (err) => {
          if (err) {
            console.error("Error inserting File details:", err);
            return res.status(500).json({
              error: true,
              message: "Failed to insert File details",
              data: {},
            });
          }
          res.status(201).json({
            error: false,
            message: "File and details inserted successfully",
            data: { project_id: projectId },
          });
        });
      } else {
        res.status(201).json({
          error: false,
          message: "File and details inserted successfully",
          data: { project_id: projectId },
        });
      }
    });
  });
},


  getProjectDetails: async function (req, res) {
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

  getInteriorCategory: async function (req, res) {
    var sql = "select * from interior_category where is_deleted = 0";

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
  getArchitecturCategory: async function (req, res) {
    var sql = "select * from architecture_category where is_deleted = 0";

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

  getAllNewFile: async function (req, res) {
    var sql = "SELECT id FROM new_mst_file ORDER BY id DESC LIMIT 1";

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
  getFilesbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `
          select nmf.*,nmfd.id as ID,nmfd.project_id,nmfd.project_name as Application_number,nmfd.assign_to_hod,nmfd.assign_members,nmfd.assign_on,nmfd.days,nmfd.hours,nmfd.completed_by 
          from new_mst_file as nmf
          left join new_mst_file_details as nmfd
          on nmfd.project_id = nmf.id and nmfd.source_type = 1 and nmfd.is_deleted = 0
          where nmf.id = ? `;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },
  getInteriorFilesbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `
          select nmf.*,nmfd.id as ID,nmfd.project_id,nmfd.project_name as Application_number,nmfd.assign_to_hod,nmfd.assign_members,nmfd.assign_on,nmfd.days,nmfd.completed_by,nmfd.hours 
          from new_mst_file as nmf
          left join new_mst_file_details as nmfd
          on nmfd.project_id = nmf.id
          where nmf.id = ? and nmfd.source_type = 3 and nmfd.is_deleted = 0 `;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },
  update: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const fileData = req.body;
    const dynamicFields = Array.isArray(req.body.dynamicFields)
      ? req.body.dynamicFields
      : [];
    const ID = req.body.ID;

    const fileValues = {
      client_id: fileData.client_id,
      company_name: fileData.company_name,
      email: fileData.email,
      phone: fileData.phone,
      project_name: fileData.project_name,
      project_type: fileData.project_type,
      category: fileData.category || null,
      archcategory: fileData.archcategory || null,
      authority: fileData.authority,
      google_location: fileData.google_location,
      lat: fileData.lat,
      long: fileData.long,
      address: fileData.address,
      land_type: fileData.land_type,
      village: fileData.village,
      city:fileData.city,
      tpscheme: fileData.tpscheme ? fileData.tpscheme : null,
      op_no: fileData.op_no,
      fp_no: fileData.fp_no,
      moje: fileData.moje,
      ward_no: fileData.ward_no,
      cs_no: fileData.cs_no,
      rs_no: fileData.rs_no,
      b_no: fileData.b_no,
      file_type: fileData.file_type,
      fire_noc: fileData.fire_noc,
      tentative_design: fileData.tentative_design,
      tentative_types: Array.isArray(fileData.tentative_types)
        ? fileData.tentative_types.join(",")
        : fileData.tentative_types || null,
      updated_by: user_id,
      updated_at: getCurrentDateAndTime(),
    };

    try {
      // Update the main file record in new_mst_file
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE new_mst_file SET ? WHERE id = ?",
          [fileValues, ID],
          (err) => {
            if (err) {
              console.error("Error updating File data:", err);
              reject("Failed to update File data");
            } else {
              resolve();
            }
          }
        );
      });

      // Now process the dynamic fields (new_mst_file_details)
      const promises = dynamicFields.map((field) => {
        return new Promise((resolve, reject) => {
          const fieldData = [
            ID,
            field.project_name,
            field.assign_to_hod,
            JSON.stringify(field.assign_members),
            field.days,
             field.hours,
            field.assign_on,
            field.completed_by ? field.completed_by : null,
            user_id,
            getCurrentDateAndTime(),
            0,
          ];

          const checkQuery =
            "SELECT id FROM new_mst_file_details WHERE source_type = 1 and project_id = ? AND project_name = ?";
          db.query(checkQuery, [ID, field.project_name], (err, results) => {
            if (err) {
              console.error("Error checking existing field:", err);
              reject("Failed to check existing field");
            } else {
              if (results.length > 0) {
                // Update existing dynamic field
                const updateQuery = `
                  UPDATE new_mst_file_details
                  SET project_name = ?, assign_to_hod = ?, assign_members = ?, days = ?, hours=?,assign_on = ?, completed_by = ?, updated_by = ?, updated_at = ?
                  WHERE source_type = 1 and project_id = ? AND project_name = ?
                `;
                const updateValues = [
                  field.project_name,
                  field.assign_to_hod,
                  JSON.stringify(field.assign_members),
                  field.days,
                   field.hours,
                  field.assign_on,
                  field.completed_by ? field.completed_by : null,
                  user_id,
                  getCurrentDateAndTime(),
                  ID,
                  field.project_name,
                ];

                db.query(updateQuery, updateValues, (err) => {
                  if (err) {
                    console.error("Error updating File details:", err);
                    reject("Failed to update File details");
                  } else {
                    // After updating, proceed to insert tasks into todos
                    const fileDetailsId = results[0].id;
                    // insertTodoTasks(fileDetailsId, field, user_id);
                    resolve();
                  }
                });
              } else {
                // Insert new dynamic field
                const insertQuery = `
                  INSERT INTO new_mst_file_details (
                    project_id, project_name, assign_to_hod, assign_members, days,hours, assign_on, completed_by, created_by, created_at, is_deleted
                  ) VALUES (?, ?, ?, ?, ?, ?, ?,?, ?, ?, ?)
                `;
                db.query(insertQuery, fieldData, (err, result) => {
                  if (err) {
                    console.error("Error inserting new File details:", err);
                    reject("Failed to insert new File details");
                  } else {
                    console.log("Inserted ID:", result.insertId);
                    // After inserting, insert tasks into todos
                    const fileDetailsId = result.insertId;
                    // insertTodoTasks(fileDetailsId, field, user_id);
                    resolve(result.insertId);
                  }
                });
              }
            }
          });
        });
      });

      // Wait for all dynamic fields to be updated or inserted
      await Promise.all(promises);

      res.status(200).json({
        error: false,
        message: "File and details updated successfully",
      });
    } catch (error) {
      console.error("Error in update function:", error);
      res.status(500).json({
        error: true,
        message: error.message || "An unexpected error occurred",
        data: {},
      });
    }

    // Helper function to insert tasks into the todos table
    // function insertTodoTasks(fileDetailsId, field, user_id) {
    //   const insertTodoQuery = `
    //     INSERT INTO todos (task, assign_to, due_date, file_id,status, created_by, created_at, is_deleted)
    //     VALUES (?, ?, ?, ?,?, ?, ?, ?)
    //   `;

    //   const updateTodoQuery = `
    //     UPDATE todos 
    //     SET task = ?, assign_to = ?, due_date = ?, file_id = ?, updated_by = ?, updated_at = ?
    //     WHERE file_id = ? AND assign_to = ?
    //   `;

    //   // Task name based on project_name value
    //   let taskName = "";

    //   if (field.project_name == 1) {
    //     taskName = "D.C";
    //   } else if (field.project_name == 2) {
    //     taskName = "P.V";
    //   } else if (field.project_name == 3) {
    //     taskName = "E-Nagar Portal";
    //   } else if (field.project_name == 4) {
    //     taskName = "Fire noc";
    //   } else if (field.project_name == 5) {
    //     taskName = "B.Permission";
    //   }

    //   if (taskName) {
    //     // Update or insert task for assign_to_hod
    //     db.query(
    //       `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
    //       [fileDetailsId, field.assign_to_hod],
    //       (err, result) => {
    //         if (err) {
    //           console.error("Error checking for existing task:", err);
    //         } else {
    //           if (result.length > 0) {
    //             // Task exists, update it
    //             db.query(
    //               updateTodoQuery,
    //               [
    //                 taskName, // task (project_name)
    //                 field.assign_to_hod, // assign_to_hod
    //                 field.completed_by, // due_date
    //                 fileDetailsId,
    //                 user_id,
    //                 getCurrentDateAndTime(),
    //                 fileDetailsId,
    //                 field.assign_to_hod,
    //               ],
    //               (err) => {
    //                 if (err) {
    //                   console.error("Error updating assign_to_hod task:", err);
    //                 }
    //               }
    //             );
    //           } else {
    //             // Task does not exist, insert it
    //             db.query(
    //               insertTodoQuery,
    //               [
    //                 taskName, // task (project_name)
    //                 field.assign_to_hod, // assign_to_hod
    //                 field.completed_by, // due_date
    //                 fileDetailsId,
    //                 0,
    //                 user_id,
    //                 getCurrentDateAndTime(),
    //                 0, // is_deleted
    //               ],
    //               (err) => {
    //                 if (err) {
    //                   console.error("Error inserting assign_to_hod task:", err);
    //                 }
    //               }
    //             );
    //           }
    //         }
    //       }
    //     );

    //     // Update or insert tasks for each member in assign_members
    //     field.assign_members.forEach((member) => {
    //       db.query(
    //         `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
    //         [fileDetailsId, member],
    //         (err, result) => {
    //           if (err) {
    //             console.error("Error checking for existing task:", err);
    //           } else {
    //             if (result.length > 0) {
    //               // Task exists, update it
    //               db.query(
    //                 updateTodoQuery,
    //                 [
    //                   taskName, // task (project_name)
    //                   member, // assign member
    //                   field.completed_by, // due_date
    //                   fileDetailsId,
    //                   user_id,
    //                   getCurrentDateAndTime(),
    //                   fileDetailsId,
    //                   member,
    //                 ],
    //                 (err) => {
    //                   if (err) {
    //                     console.error(
    //                       "Error updating assign_member task:",
    //                       err
    //                     );
    //                   }
    //                 }
    //               );
    //             } else {
    //               // Task does not exist, insert it
    //               db.query(
    //                 insertTodoQuery,
    //                 [
    //                   taskName,
    //                   member, // assign member
    //                   field.completed_by,
    //                   fileDetailsId,
    //                   0,
    //                   user_id,
    //                   getCurrentDateAndTime(),
    //                   0, // is_deleted
    //                 ],
    //                 (err) => {
    //                   if (err) {
    //                     console.error(
    //                       "Error inserting assign_member task:",
    //                       err
    //                     );
    //                   }
    //                 }
    //               );
    //             }
    //           }
    //         }
    //       );
    //     });
    //   }
    // }
  },

  updateInterior: async function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const fileData = req.body;
    const dynamicFields = req.body.dynamicFields;
    const ID = req.body.ID;
    console.log("req.body==>", req.body);

    const fileValues = {
      client_id: fileData.client_id,
      company_name: fileData.company_name,
      email: fileData.email,
      phone: fileData.phone,
      project_name: fileData.project_name,
      project_type: fileData.project_type,
      category: fileData.category,
      authority: fileData.authority,
      google_location: fileData.google_location,
      lat: fileData.lat,
      long: fileData.long,
      address: fileData.address,
      land_type: fileData.land_type,
      village: fileData.village,
      tpscheme: fileData.tpscheme ? fileData.tpscheme : null,
      op_no: fileData.op_no,
      fp_no: fileData.fp_no,
      moje: fileData.moje,
      ward_no: fileData.ward_no,
      cs_no: fileData.cs_no,
      rs_no: fileData.rs_no,
      b_no: fileData.b_no,
      file_type: fileData.file_type,
      fire_noc: fileData.fire_noc,
      updated_by: user_id,
      updated_at: getCurrentDateAndTime(),
    };

    try {
      // Update the main file record in new_mst_file
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE new_mst_file SET ? WHERE id = ?",
          [fileValues, ID],
          (err) => {
            if (err) {
              console.error("Error updating File data:", err);
              reject("Failed to update File data");
            } else {
              resolve();
            }
          }
        );
      });

      // Now process the dynamic fields (new_mst_file_details)
      const promises = dynamicFields.map((field) => {
        return new Promise((resolve, reject) => {
          const fieldData = [
            ID,
            field.project_name,
            field.assign_to_hod,
            JSON.stringify(field.assign_members),
            field.days,
             field.hours,
            field.assign_on,
            field.completed_by ? field.completed_by : null,
            user_id,
            getCurrentDateAndTime(),
            0,
          ];

          const checkQuery =
            "SELECT id FROM new_mst_file_details WHERE source_type = 3 and project_id = ? AND project_name = ?";
          db.query(checkQuery, [ID, field.project_name], (err, results) => {
            if (err) {
              console.error("Error checking existing field:", err);
              reject("Failed to check existing field");
            } else {
              if (results.length > 0) {
                // Update existing dynamic field
                const updateQuery = `
                  UPDATE new_mst_file_details
                  SET project_name = ?, assign_to_hod = ?, assign_members = ?, days = ?,hours=?, assign_on = ?, completed_by = ?, updated_by = ?, updated_at = ?
                  WHERE source_type = 3 and project_id = ? AND project_name = ?
                `;
                const updateValues = [
                  field.project_name,
                  field.assign_to_hod,
                  JSON.stringify(field.assign_members),
                  field.days,
                   field.hours,
                  field.assign_on,
                  field.completed_by ? field.completed_by : null,
                  user_id,
                  getCurrentDateAndTime(),
                  ID,
                  field.project_name,
                ];

                db.query(updateQuery, updateValues, (err) => {
                  if (err) {
                    console.error("Error updating File details:", err);
                    reject("Failed to update File details");
                  } else {
                    // After updating, proceed to insert tasks into todos
                    const fileDetailsId = results[0].id;
                    // insertTodoTasks(fileDetailsId, field, user_id);
                    resolve();
                  }
                });
              } else {
                // Insert new dynamic field
                const insertQuery = `
                  INSERT INTO new_mst_file_details (
                    project_id, project_name, assign_to_hod, assign_members, days,hours, assign_on, completed_by, created_by, created_at, is_deleted
                  ) VALUES (?, ?, ?, ?, ?,?, ?, ?, ?, ?, ?)
                `;
                db.query(insertQuery, fieldData, (err, result) => {
                  if (err) {
                    console.error("Error inserting new File details:", err);
                    reject("Failed to insert new File details");
                  } else {
                    console.log("Inserted ID:", result.insertId);
                    // After inserting, insert tasks into todos
                    const fileDetailsId = result.insertId;
                    // insertTodoTasks(fileDetailsId, field, user_id);
                    resolve(result.insertId);
                  }
                });
              }
            }
          });
        });
      });

      // Wait for all dynamic fields to be updated or inserted
      await Promise.all(promises);

      res.status(200).json({
        error: false,
        message: "File and details updated successfully",
      });
    } catch (error) {
      console.error("Error in update function:", error);
      res.status(500).json({
        error: true,
        message: error.message || "An unexpected error occurred",
        data: {},
      });
    }

    // // Helper function to insert tasks into the todos table
    // function insertTodoTasks(fileDetailsId, field, user_id) {
    //   const insertTodoQuery = `
    //     INSERT INTO todos (task, assign_to, due_date, file_id,status, created_by, created_at, is_deleted)
    //     VALUES (?, ?, ?, ?,?, ?, ?, ?)
    //   `;

    //   const updateTodoQuery = `
    //     UPDATE todos 
    //     SET task = ?, assign_to = ?, due_date = ?, file_id = ?, updated_by = ?, updated_at = ?
    //     WHERE file_id = ? AND assign_to = ?
    //   `;

    //   // Task name based on project_name value
    //   let taskName = "";

    //   if (field.project_name == 1) {
    //     taskName = "Basic Details";
    //   } else if (field.project_name == 2) {
    //     taskName = "Study/RND";
    //   } else if (field.project_name == 3) {
    //     taskName = "Space Planning";
    //   } else if (field.project_name == 4) {
    //     taskName = "Quotation";
    //   } else if (field.project_name == 5) {
    //     taskName = "Material";
    //   } else if (field.project_name == 6) {
    //     taskName = "Concept";
    //   } else if (field.project_name == 7) {
    //     taskName = "Technical Drawing";
    //   } else if (field.project_name == 8) {
    //     taskName = "3D";
    //   } else if (field.project_name == 9) {
    //     taskName = "Schedule";
    //   }

    //   if (taskName) {
    //     // Update or insert task for assign_to_hod
    //     db.query(
    //       `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
    //       [fileDetailsId, field.assign_to_hod],
    //       (err, result) => {
    //         if (err) {
    //           console.error("Error checking for existing task:", err);
    //         } else {
    //           if (result.length > 0) {
    //             // Task exists, update it
    //             db.query(
    //               updateTodoQuery,
    //               [
    //                 taskName, // task (project_name)
    //                 field.assign_to_hod, // assign_to_hod
    //                 field.completed_by, // due_date
    //                 fileDetailsId,
    //                 user_id,
    //                 getCurrentDateAndTime(),
    //                 fileDetailsId,
    //                 field.assign_to_hod,
    //               ],
    //               (err) => {
    //                 if (err) {
    //                   console.error("Error updating assign_to_hod task:", err);
    //                 }
    //               }
    //             );
    //           } else {
    //             // Task does not exist, insert it
    //             db.query(
    //               insertTodoQuery,
    //               [
    //                 taskName, // task (project_name)
    //                 field.assign_to_hod, // assign_to_hod
    //                 field.completed_by, // due_date
    //                 fileDetailsId,
    //                 0,
    //                 user_id,
    //                 getCurrentDateAndTime(),
    //                 0, // is_deleted
    //               ],
    //               (err) => {
    //                 if (err) {
    //                   console.error("Error inserting assign_to_hod task:", err);
    //                 }
    //               }
    //             );
    //           }
    //         }
    //       }
    //     );

    //     // Update or insert tasks for each member in assign_members
    //     field.assign_members.forEach((member) => {
    //       db.query(
    //         `SELECT id FROM todos WHERE file_id = ? AND assign_to = ?`,
    //         [fileDetailsId, member],
    //         (err, result) => {
    //           if (err) {
    //             console.error("Error checking for existing task:", err);
    //           } else {
    //             if (result.length > 0) {
    //               // Task exists, update it
    //               db.query(
    //                 updateTodoQuery,
    //                 [
    //                   taskName, // task (project_name)
    //                   member, // assign member
    //                   field.completed_by, // due_date
    //                   fileDetailsId,
    //                   user_id,
    //                   getCurrentDateAndTime(),
    //                   fileDetailsId,
    //                   member,
    //                 ],
    //                 (err) => {
    //                   if (err) {
    //                     console.error(
    //                       "Error updating assign_member task:",
    //                       err
    //                     );
    //                   }
    //                 }
    //               );
    //             } else {
    //               // Task does not exist, insert it
    //               db.query(
    //                 insertTodoQuery,
    //                 [
    //                   taskName,
    //                   member, // assign member
    //                   field.completed_by,
    //                   fileDetailsId,
    //                   0,
    //                   user_id,
    //                   getCurrentDateAndTime(),
    //                   0, // is_deleted
    //                 ],
    //                 (err) => {
    //                   if (err) {
    //                     console.error(
    //                       "Error inserting assign_member task:",
    //                       err
    //                     );
    //                   }
    //                 }
    //               );
    //             }
    //           }
    //         }
    //       );
    //     });
    //   }
    // }
  },

  deleteFile: function (req, res) {
    const fileId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `new_mst_file_details` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      fileId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "File has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getDaysbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `SELECT no_of_days 
               FROM new_mst_file_project_details 
               WHERE project_id = ? AND application_name = 'approval_process'`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },

  getInteriorDaysbyId: (req, res) => {
    var id = parseInt(req.params.id);

    if (!id) {
      return res
        .status(400)
        .json({ error: true, message: "Id is required", data: {} });
    }

    var sql = `SELECT no_of_days 
               FROM new_mst_file_project_details 
               WHERE project_id = ? AND application_name = 'interior_design'`;

    db.query(sql, [id], function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (result.length > 0) {
        return res
          .status(200)
          .json({ error: false, message: "Record fetched", data: result });
      } else {
        return res.status(404).json({
          error: true,
          message: "Requesting record not found",
          data: {},
        });
      }
    });
  },
  updateService: async function (req, res) {
    const dynamicFields = req.body.dynamicFields;
    const ID = req.body.ID;
    const user_id = req.user ? req.user.id : null;
    const case_id = req.body.caseID;

    try {
      const fileValues = {
        case_id: case_id,
      };

      // Step 1: Update new_mst_file
      db.query(
        "UPDATE new_mst_file SET ? WHERE id = ?",
        [fileValues, ID],
        (err, result) => {
          if (err) {
            console.error("Error updating File data:", err);
            return res.status(500).json({
              error: true,
              message: "Failed to update File data",
              data: {},
            });
          }

          const projectId = ID;

          // Step 2: Loop through dynamicFields to insert/update project details
          const promises = dynamicFields.map((field) => {
            return new Promise((resolve, reject) => {
              db.query(
                `SELECT id FROM new_mst_file_project_details WHERE project_id = ? AND application_name = ? AND is_deleted = 0`,
                [projectId, field.project_name],
                (err, results) => {
                  if (err) return reject(err);

                  if (results.length > 0) {
                    // Update existing record
                    const updateQuery = `
                    UPDATE new_mst_file_project_details 
                    SET assign_to_hod = ?, no_of_days = ?, updated_at = ?, created_by = ?
                    WHERE id = ?
                  `;
                    db.query(
                      updateQuery,
                      [
                        field.assign_to_hod,
                        field.days,
                        getCurrentDateAndTime(),
                        user_id,
                        results[0].id,
                      ],
                      (err, updateResult) => {
                        if (err) return reject(err);
                        resolve(updateResult);
                      }
                    );
                  } else {
                    // Insert new record
                    const insertQuery = `
                    INSERT INTO new_mst_file_project_details (
                      project_id, application_name, assign_to_hod, no_of_days, created_by, created_at, updated_at, is_deleted
                    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0)
                  `;
                    db.query(
                      insertQuery,
                      [
                        projectId,
                        field.project_name,
                        field.assign_to_hod,
                        field.days,
                        user_id,
                        getCurrentDateAndTime(),
                      ],
                      (err, insertResult) => {
                        if (err) return reject(err);
                        resolve(insertResult);
                      }
                    );
                  }
                }
              );
            });
          });

          Promise.all(promises)
            .then(async () => {
              // Step 3: Check and insert into new_mst_file_details if not exists
              const insertIfNotExists = async () => {
                const checkAndInsert = (source_type, count, assign_to_hod) => {
                  return new Promise((resolve, reject) => {
                    db.query(
                      `SELECT id FROM new_mst_file_details WHERE project_id = ? AND source_type = ? AND is_deleted = 0 LIMIT 1`,
                      [projectId, source_type],
                      (err, result) => {
                        if (err) return reject(err);

                        if (result.length === 0) {
                          const rows = [];
                          for (let i = 0; i < count; i++) {
                            const project_name =`${i + 1}`;
                            rows.push([
                              projectId,
                              project_name,
                              assign_to_hod,
                              source_type,
                              user_id,
                              getCurrentDateAndTime(),
                              null,
                              0,
                            ]);
                          }

                          db.query(
                            `INSERT INTO new_mst_file_details 
                           (project_id, project_name, assign_to_hod, source_type, created_by, created_at, updated_at, is_deleted) 
                           VALUES ?`,
                            [rows],
                            (err, insertResult) => {
                              if (err) return reject(err);
                              resolve(insertResult);
                            }
                          );
                        } else {
                          resolve(); // already exists, skip
                        }
                      }
                    );
                  });
                };

                const insertPromises = [];

                const approvalField = dynamicFields.find(
                  (field) => field.project_name === "approval_process"
                );
                if (approvalField) {
                  insertPromises.push(
                    checkAndInsert(1, 5, approvalField.assign_to_hod || null)
                  );
                }

                const archField = dynamicFields.find(
                  (field) => field.project_name === "architecture_design"
                );
                if (archField) {
                  insertPromises.push(
                    checkAndInsert(2, 8, archField.assign_to_hod || null)
                  );
                }

                const interiorField = dynamicFields.find(
                  (field) => field.project_name === "interior_design"
                );
                if (interiorField) {
                  insertPromises.push(
                    checkAndInsert(3, 8, interiorField.assign_to_hod || null)
                  );
                }

                return Promise.all(insertPromises);
              };

              // Step 4: Call the insertIfNotExists function
              insertIfNotExists()
                .then(() => {
                  return res.status(201).json({
                    error: false,
                    message: "File and project details updated successfully",
                    data: { project_id: projectId },
                  });
                })
                .catch((err) => {
                  console.error("Error inserting file details:", err);
                  return res.status(500).json({
                    error: true,
                    message: "Failed to insert file details",
                    data: {},
                  });
                });
            })
            .catch((err) => {
              console.error("Error in Promise.all:", err);
              return res.status(500).json({
                error: true,
                message: "Failed to update File project details",
                data: {},
              });
            });
        }
      );
    } catch (error) {
      console.error("Catch block error in updateService:", error);
      return res.status(500).json({
        error: true,
        message: "Something went wrong",
        data: {},
      });
    }
  },
getServicebyId: (req, res) => {
  var id = parseInt(req.params.id);

  if (!id) {
    return res.status(400).json({ error: true, message: "Id is required", data: {} });
  }

  // Step 1: Always get case_id from new_mst_file first
  db.query(
    `SELECT case_id FROM new_mst_file WHERE id = ?`,
    [id],
    (err, fileResult) => {
      if (err) {
        return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
      }

      if (!fileResult.length) {
        return res.status(404).json({ error: true, message: "File not found", data: {} });
      }

      // Strip old initials — keep base up to last "/"
      const rawCaseId = fileResult[0].case_id || "";
      const baseCaseId = rawCaseId.includes("/")
        ? rawCaseId.substring(0, rawCaseId.lastIndexOf("/") + 1)
        : rawCaseId;

      // Step 2: Get project details
      db.query(
        `SELECT id, application_name, no_of_days, assign_to_hod
         FROM new_mst_file_project_details
         WHERE project_id = ? AND is_deleted = 0`,
        [id],
        (err, projectResult) => {
          if (err) {
            return res.status(500).json({ error: true, message: err.sqlMessage, data: {} });
          }

          // No project details yet — return case_id with empty row
          if (projectResult.length === 0) {
            return res.status(200).json({
              error: false,
              message: "No project details found",
              data: [{ case_id: baseCaseId, application_name: "", assign_to_hod: "", no_of_days: "" }],
            });
          }

          // Attach baseCaseId to every row
          const data = projectResult.map((row) => ({ ...row, case_id: baseCaseId }));

          return res.status(200).json({ error: false, message: "Record fetched", data: data });
        }
      );
    }
  );
},
};
