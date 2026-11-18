const commonController = require("../api/commonController");
const moment = require("moment");

module.exports = {
  getApproval: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
        nmf.id, 
        nmf.case_id, 
        nmf.project_name, 
        nmf.fp_no, 
        nmf.op_no, 
        nmf.b_no, 
        nmf.rs_no, 
        nmf.authority, 
        nmf.client_id,
        nmf.tentative_design,
        mc.name AS projectType, 
        mpt.title AS category, 
        v.name AS village, 
         u.first_name as client_name,
        tp.tpscheme
    
    FROM 
        new_mst_file AS nmf
    LEFT JOIN 
        mst_category AS mc ON mc.id = nmf.project_type
    LEFT JOIN 
        mst_project_type AS mpt ON mpt.id = nmf.category
    LEFT JOIN 
        village AS v ON v.id = nmf.village
    LEFT JOIN 
        tpscheme AS tp ON tp.id = nmf.tpscheme
          left join users as u on u.id = nmf.client_id
           LEFT JOIN 
        new_mst_file_project_details AS nmfpd ON nmfpd.project_id = nmf.id
          WHERE 
          nmf.is_deleted = 0   and nmfpd.application_name = "approval_process" and nmf.client_id = ?`;

      console.log(sql);

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  getDocumentbyID: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql = `
            SELECT 
              dc.id,
              dc.team_id,
              dc.card,
              nmd.doc_name,
              dc.photo,
              dc.document_clearance_id,
              dc.doc_id,
              dc.type,
              dc.is_deleted 
            FROM 
              document_collection as dc  
            LEFT JOIN 
              new_mst_document as nmd 
            ON 
              nmd.id = dc.doc_id 
            WHERE 
              dc.is_deleted = 0 
            AND 
              dc.document_clearance_id = ${id}`;

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
            res.status(201).json({
              error: true,
              message: "Requesting record not found",
              data: {},
            });
          }
        }
      });
    }
  },

  getPvbyId: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id, application_date, document_file, pv_date, pv_file FROM pv WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            application_date: moment(row.application_date).format("YYYY-MM-DD"),
            pv_date: moment(row.pv_date).format("YYYY-MM-DD"),
          }));
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

  getfireNocbyId: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id,assign_application_date,received_application_date,application_number,fire_noc_receipt FROM fire_noc WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            assign_application_date: moment(row.assign_application_date).format(
              "YYYY-MM-DD"
            ),
            received_application_date: moment(
              row.received_application_date
            ).format("YYYY-MM-DD"),
          }));
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

  getenagarInputbyId: (req, res) => {
    // Access and parse the id from the request params
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
          application_upload_date: moment(
            result[0].application_upload_date
          ).format("YYYY-MM-DD"),
          applicationnumber: result[0].applicationnumber,
          loginId: result[0].loginId,
          password: result[0].password,
          drawings: [], // Initialize an array for drawings
        };

        // Loop through results to gather drawing data
        result.forEach((row) => {
          baseData.drawings.push({
            drawing_id: row.enid_id,
            upload_date: moment(row.upload_date).format("YYYY-MM-DD"),
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
    // Access and parse the id from the request params
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
          details: [], // Initialize an array for drawings
        };

        // Loop through results to gather drawing data
        result.forEach((row) => {
          baseData.details.push({
            details_id: row.details_id,
            status_date: moment(row.status_date).format("YYYY-MM-DD"),
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

  getInwardDetailsbyId: (req, res) => {
    var id = parseInt(req.params.id);

    var sql = `SELECT * FROM inward_details WHERE is_deleted = 0 AND approval_id = ${id}`;
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

  getoutewardbyId: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id,building_date,building_letter,approval_date,approval_plan FROM outward_details WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            building_date: moment(row.building_date).format("YYYY-MM-DD"),
            approval_date: moment(row.approval_date).format("YYYY-MM-DD"),
          }));
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

  getApprovalbyid: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id,level,date,status,query,approved_letter FROM approval_process WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            date: moment(row.date).format("YYYY-MM-DD"),
          }));
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

  getAllfeesbyId: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id,receipt_no,fee_type,amount,date,file_upload FROM all_important_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            date: moment(row.date).format("YYYY-MM-DD"),
          }));
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

  getworkfeesbyId: (req, res) => {
    var id = parseInt(req.params.id);
    var sql = `SELECT id,receipt_no,fee_type,amount,date,file_upload FROM work_fees WHERE is_deleted = 0 AND approval_id = ${id}`;

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        if (result.length > 0) {
          // Format date fields as YYYY-MM-DD
          result = result.map((row) => ({
            ...row,
            date: moment(row.date).format("YYYY-MM-DD"),
          }));
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
};
