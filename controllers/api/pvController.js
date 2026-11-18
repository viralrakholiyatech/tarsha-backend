const {
  unlinkMultipleImages,
  getImageWithFolder,
  getImageWithname,
  unlinkSingleImage,
  getImageWithFoldername,
} = require("../../services/FileService");
module.exports = {
  getPVFile: async function (req, res) {
    var sql =
      "select nmf.id as ID,nmfd.id,nmfd.project_name,nmfd.assign_to_hod,nmfd.assign_date,nmfd.complete_date,nmf.case_id,nmf.land_type,v.name,tp.tpscheme,nmf.op_no,nmf.fp_no,nmf.subplot_no, nmf.rs_no,nmf.b_no,u.first_name,u.last_name from new_mst_file_details as nmfd  left join  new_mst_file as nmf  on nmf.id = nmfd.project_id left join users as u on u.id = nmf.client_id  left join village as v on v.id = nmf.village  left join tpscheme as tp  on tp.id = nmf.tpscheme where nmfd.is_deleted = 0 and nmfd.project_name = 3";

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
  add: function (req, res) {
    const files = [];
    const this_data = req.body;
    let document_file = this_data.document_file || "";
    let certificate_file = this_data.certificate_file || this_data.pv_file || "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "document_file") {
          document_file = getImageWithFoldername(file.path);
          files.push(document_file);
        } else if (file.fieldname === "certificate_file") {
          certificate_file = getImageWithFoldername(file.path);
          files.push(certificate_file);
        } else {
          unlinkSingleImage(getImageWithFoldername(file.path));
        }
      });
    }

    const user_id = req.user ? req.user.id : null;

    const PV = {
      approval_id: this_data.approval_id,
      application_date: this_data.application_date,
      pv_date:
        this_data.validation_date && this_data.validation_date.trim() !== ""
          ? this_data.validation_date
          : null,
      created_by: user_id,
      document_file: document_file,
      pv_file: certificate_file,
      created_at: null,
      updated_at: getCurrentDateAndTime(),
      updated_by: user_id,
      is_deleted: 0,
    };

    const handleTodosUpdate = (projectId) => {
      const fetchSql = `
        SELECT id FROM new_mst_file_details 
        WHERE source_type = 1 AND project_name = 2 AND project_id = ?`;

      db.query(fetchSql, [projectId], (err, result) => {
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
      const getExistingFilesQuery = `SELECT application_date, document_file, pv_date, pv_file FROM pv WHERE id = ?`;

      db.query(getExistingFilesQuery, [this_data.id], function (err, results) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (results.length > 0) {
          const existing = results[0];

          if (!document_file && this_data.document_file_cleared === "true") {
            PV.document_file = null;
          } else if (!document_file) {
            PV.document_file = existing.document_file;
          }

          if (!certificate_file && (this_data.certificate_file_cleared === "true" || this_data.pv_file_cleared === "true")) {
            PV.pv_file = null;
          } else if (!certificate_file) {
            PV.pv_file = existing.pv_file;
          }

          const finalAppDate = PV.application_date || existing.application_date;
          const finalPvDate = PV.pv_date || existing.pv_date;
          const finalDocFile = PV.document_file || existing.document_file;
          const finalPvFile = PV.pv_file || existing.pv_file;

          if (finalAppDate && finalPvDate && finalDocFile && finalPvFile) {
            PV.completed_date = getCurrentDate();
          }
        }

        const updateQuery = `UPDATE pv SET ? WHERE id = ?`;

        db.query(updateQuery, [PV, this_data.id], function (err, result) {
          if (err) {
            return res
              .status(500)
              .json({ error: true, message: err.sqlMessage, data: {} });
          }

          if (PV.completed_date && this_data.approval_id) {
            handleTodosUpdate(this_data.approval_id);
          }

          return res.status(200).json({
            error: false,
            message: "pv has been updated successfully.",
            data: { id: this_data.id },
          });
        });
      });
    } else {
      PV.created_at = getCurrentDateAndTime();
      PV.updated_at = null;
      PV.updated_by = null;

      if (PV.application_date && PV.pv_date && PV.document_file && PV.pv_file) {
        PV.completed_date = getCurrentDate();
      }

      db.query("INSERT INTO pv SET ?", PV, function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        if (PV.completed_date && this_data.approval_id) {
          handleTodosUpdate(this_data.approval_id);
        }

        return res.status(201).json({
          error: false,
          message: "pv has been added successfully.",
          data: { id: result.insertId },
        });
      });
    }
  },



  getPvbyId: (req, res) => {
    var id = parseInt(req.params.id);

    var sql = `SELECT id,application_date,document_file,pv_date,pv_file FROM pv WHERE is_deleted = 0 AND approval_id = ${id}`;

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

  deletepvcertificate: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          pv_file: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `pv` SET `pv_file` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [data.pv_file, data.updated_at, data.updated_by, id];

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
  deletedocumentfile: (req, res) => {
    try {
      const id = !isNaN(parseInt(req?.params?.id))
        ? parseInt(req?.params?.id)
        : undefined;

      if (id) {
        const data = {
          document_file: null, // Set to NULL instead of an empty string
          updated_at: getCurrentDateAndTime(),
          updated_by: !isNaN(parseInt(req?.user?.id))
            ? parseInt(req?.user?.id)
            : 0,
        };

        const sql =
          "UPDATE `pv` SET `document_file` = ?, `updated_at` = ?, `updated_by` = ? WHERE `approval_id` = ?";
        const values = [
          data.document_file,
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
