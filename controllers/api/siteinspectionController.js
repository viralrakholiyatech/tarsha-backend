const {
  unlinkMultipleImages,
  getImageWithFolder,
  unlinkSingleImage,
} = require("../../services/FileService");

const nodemailer = require("nodemailer");
// const {sendEmail} = require("../../services/MailService")
// const { mailConstant } = require("../../helpers/constants");

// Create a transporter with your email service provider's settings
const transporter = nodemailer.createTransport({
  service: "Gmail", // e.g., 'Gmail', 'Yahoo', etc.
  auth: {
    user: "alifights72@gmail.com",
    pass: process.env.INSPECTION_SMTP_PASSWORD,
  },
});

// Function to send email to admin
function sendEmailToAdmin(subject, text) {
  const mailOptions = {
    from: "alifights72@gmail.com",
    to: "info@vcaretechnologies.net", // Replace with the admin's email address
    subject: subject,
    text: text,
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}
module.exports = {
  add: function (req, res) {
    const requiredFields = [
      "mst_file_project_id",
      "key_observation",
      "remarks",
      "site_incharge",
      "authorized_person",
      "review_by",
    ];

    // Check for missing fields
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      const errorMessage =
        "Missing required fields: " + missingFields.join(", ");
      console.error(errorMessage);
      return res
        .status(400)
        .json({ error: true, message: errorMessage, data: {} });
    }

    // Process uploaded files if any
    const files = [];
    let client_sign = req.body?.client_sign || "";
    let review_by_sign = req.body?.review_by_sign || "";

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "client_sign") {
          client_sign = getImageWithFolder(file.path);
          files.push(client_sign);
        } else if (file.fieldname === "review_by_sign") {
          review_by_sign = getImageWithFolder(file.path);
          files.push(review_by_sign);
        } else {
          // Unlink unnecessary files
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(getImageWithFolder(file.path));
          }
        }
      });
    }

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const site = {
      mst_type_id: this_data.mst_type_id,
      mst_inspection_checklist_id: this_data.selectedSecondDropdownValue,
      others_text: this_data.others_text,
      department: this_data.department,
      mst_file_project_id: this_data.mst_file_project_id,
      key_observation: this_data.key_observation || "",
      remarks: this_data.remarks || "",
      site_incharge: this_data.site_incharge || "",
      authorized_person: this_data.authorized_person || "",
      review_by: this_data.review_by || "",
      created_by: user_id,
      client_sign: client_sign,
      review_by_sign: review_by_sign,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("site==>", site);

    db.query("INSERT INTO site_inspection SET ?", site, function (err, result) {
      if (err) {
      
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

     
      const data = {
        error: false,
        message: "Site inspection has been added successfully.",
        data: {
          id: result.insertId,
          
        },
      };
      res.status(201).json(data);
    });
  },

  getsites: async function (req, res) {
    const team_id = req?.body?.team_id;
    const project_id = req?.query?.project_id || req?.params?.id || req?.body?.project_id;

    //get current user
    var sql = `select si.id,DATE_FORMAT(si.created_at, '%d %b %Y') AS created_at,si.site_incharge,si.client_sign,u.first_name as inspectedby,nmf.case_id,nmf.id as nmf_id,cu.first_name as client_name,mt.type_name as visit_work,mic.title as visit_category,md.name as department
from site_inspection as si
left join users as u 
on u.id = si.review_by
left join new_mst_file as nmf
on nmf.id = si.mst_file_project_id 
left join users as cu 
on cu.id = nmf.client_id
left join mst_type as mt
on mt.id = si.mst_type_id
left join mst_inspection_checklist as mic
on mic.id = si.mst_inspection_checklist_id
left join mst_department as md
on md.id = si.department
where si.is_deleted =0`;

    const queryParams = [];
    if (project_id) {
      sql += ` and si.mst_file_project_id = ?`;
      queryParams.push(project_id);
    }
    sql += ` order by si.id desc`;

    db.query(sql, queryParams, function (err, result) {
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

  getsitesbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select * from site_inspection   where is_deleted = 0   and id=" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
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
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  update: function (req, res) {
    const requiredFields = [
      "mst_file_project_id",
      "client_id",
      "key_observation",
      "remarks",
      "site_incharge",
      "authorized_person",
      "review_by",
    ];

    const errors = typeof req.validationErrors === "function" ? req.validationErrors() : null;

    if (errors) {
      const errorMessage = errors[0].msg;
      console.error(errorMessage);
      return res
        .status(400)
        .json({ error: true, message: errorMessage, data: {} });
    }

    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var oldFiles = [];
    var newFiles = [];
    var client_sign = this_data?.client_sign;
    var review_by_sign = this_data?.review_by_sign;

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "client_sign") {
          client_sign = getImageWithFolder(f.path);
          newFiles.push(client_sign);
        } else if (f.fieldname === "review_by_sign") {
          review_by_sign = getImageWithFolder(f.path);
          newFiles.push(review_by_sign);
        } else {
          /*Remove others name images*/
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(getImageWithFolder(f.path));
          }
        }
      });
    }

    const id = parseInt(this_data.id);
    if (!id || isNaN(id)) {
      unlinkMultipleImages(newFiles);
      return res.status(400).json({ error: true, message: "Valid ID is required", data: {} });
    }

    var sql = "SELECT * FROM `site_inspection` WHERE `id` = ?";

    db.query(sql, [id], (err, result) => {
      if (err || !result || result.length === 0) {
        unlinkMultipleImages(newFiles);
        return res
          .status(err ? 500 : 404)
          .json({ error: true, message: err ? err.sqlMessage : "Site inspection not found", data: {} });
      }

      const existingRecord = result[0];

      if (client_sign !== undefined) {
        if (existingRecord.client_sign && existingRecord.client_sign !== client_sign) {
          oldFiles.push(existingRecord.client_sign);
        }
      } else {
        client_sign = existingRecord.client_sign;
      }

      if (review_by_sign !== undefined) {
        if (existingRecord.review_by_sign && existingRecord.review_by_sign !== review_by_sign) {
          oldFiles.push(existingRecord.review_by_sign);
        }
      } else {
        review_by_sign = existingRecord.review_by_sign;
      }

      const user_id = req?.user?.id;
      const checklistId = this_data.selectedSecondDropdownValue || this_data.mst_inspection_checklist_id;

      const site = {
        mst_type_id: this_data.mst_type_id ? parseInt(this_data.mst_type_id) : (existingRecord.mst_type_id || 0),
        mst_inspection_checklist_id: checklistId ? parseInt(checklistId) : (checklistId === "" ? 0 : (existingRecord.mst_inspection_checklist_id || 0)),
        department: this_data.department ? parseInt(this_data.department) : (existingRecord.department || 0),
        others_text: this_data.others_text !== undefined ? this_data.others_text : (existingRecord.others_text || ""),
        mst_file_project_id: this_data.mst_file_project_id ? parseInt(this_data.mst_file_project_id) : (existingRecord.mst_file_project_id || 0),
        key_observation: this_data.key_observation !== undefined ? this_data.key_observation : (existingRecord.key_observation || ""),
        remarks: this_data.remarks !== undefined ? this_data.remarks : (existingRecord.remarks || ""),
        site_incharge: this_data.site_incharge !== undefined ? this_data.site_incharge : (existingRecord.site_incharge || ""),
        authorized_person: this_data.authorized_person !== undefined ? this_data.authorized_person : (existingRecord.authorized_person || ""),
        review_by: this_data.review_by ? parseInt(this_data.review_by) : (existingRecord.review_by || 0),
        client_sign: client_sign || "",
        review_by_sign: review_by_sign || "",
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id || null,
      };

      console.log("Updating site inspection with:", site);

      db.query("UPDATE `site_inspection` SET ? WHERE `id` = ?", [site, id], (updateErr, updateResult) => {
        if (updateErr) {
          unlinkMultipleImages(newFiles);
          return res.status(500).json({ error: true, message: updateErr.sqlMessage, data: {} });
        }

        if (oldFiles.length > 0) {
          unlinkMultipleImages(oldFiles);
        }

        const response = {
          error: false,
          message: "Site has been updated...",
          data: {},
        };
        // Send email to admin
        const emailSubject = "Site Updated";
        const emailText =
          "A site has been updated. Check the dashboard for details.";
        sendEmailToAdmin(emailSubject, emailText);

        res.status(200).json(response);
      });
    });
  },

  getfileData: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql = ` SELECT nmf.id, nmf.company_name,nmf.address,nmf.lat,nmf.long,nmf.google_location,mpt.title as category_type,mc.name as project_type,nmf.fp_no,nmf.ward_no,tp.tpscheme,nmf.cs_no,nmf.b_no,nmf.op_no,nmf.rs_no
          FROM new_mst_file AS nmf
          LEFT JOIN mst_project_type AS mpt ON mpt.id = nmf.category
           left join mst_category as mc on mc.id = nmf.project_type
           left join tpscheme as tp on tp.id = nmf.tpscheme
          WHERE  nmf.is_deleted = 0 and nmf.id =?`;

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
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
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getChecklist: async function (req, res) {
    const user_id = req?.user?.id;

    //get current user
    var sql = "select * from mst_inspection_checklist where is_deleted = 0";

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

  getempsite: (req, res) => {
    try {
      const id = req?.user.id ? parseInt(req?.user?.id) : undefined;

      if (parseInt(id) != NaN) {
        var sql = `select si.id,DATE_FORMAT(si.created_at, '%d %b %Y') AS created_at,si.site_incharge,si.client_sign,u.first_name as inspectedby,nmf.case_id,nmf.id as nmf_id,cu.first_name as client_name,mt.type_name as visit_work,mic.title as visit_category,md.name as department
from site_inspection as si
left join users as u 
on u.id = si.review_by
left join new_mst_file as nmf
on nmf.id = si.mst_file_project_id 
left join users as cu 
on cu.id = nmf.client_id
left join mst_type as mt
on mt.id = si.mst_type_id
left join mst_inspection_checklist as mic
on mic.id = si.mst_inspection_checklist_id
left join mst_department as md
on md.id = si.department
where si.is_deleted =0 and si.review_by = ?
 order by si.id desc`;
        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(200)
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
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  deletesite: function (req, res) {
    const siteInspectionId = req.params.id;

    const id = req.user.id;

    var sql =
      "UPDATE `site_inspection` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      siteInspectionId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Site inspection has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  // },

  getTotalClient: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select COUNT(client_id) AS total_entries from site_inspection   where is_deleted = 0   and client_id=" +
          id +
          "";
        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
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
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(200)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
};
