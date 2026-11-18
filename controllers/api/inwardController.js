const { getImageWithFoldername, unlinkSingleImage } = require("../../services/FileService");
module.exports = {
  AddInward: function (req, res) {
    const files = [];
    let signature = req.body?.signature || "";
    let photo = req.body?.photo || "";

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "signature") {
          signature = getImageWithFoldername(file.path);
          files.push(signature);
        } else if (file.fieldname === "photo") {
          photo = getImageWithFoldername(file.path);
          files.push(photo);
        } else {
          unlinkImage(file.path);
        }
      });
    }

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const inward = {
      clientid: this_data.clientId || null,
      project: this_data.project || null,
      item: this_data.item,
      received_from: this_data.received_from || null,
      received_contact: this_data.received_contact || null,
      handover: this_data.handover || null,
      signature: signature,
      photo: photo,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO inward SET ?", inward, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Inward has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  fetchAdminList: (req, res) => {
    var sql = `   
    SELECT i.id,i.item,i.received_from,i.received_contact,i.signature,i.photo, DATE_FORMAT(i.created_at, '%d %b %Y') AS created_at,u.first_name as client_name,h.first_name as handover,nmf.case_id
FROM inward as i 
left join users as u on u.id =i.clientid
left join users as h on h.id = i.handover
left join new_mst_file as nmf on nmf.id = i.project
WHERE i.is_deleted =0`;

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
  },

  fetchTeamList: (req, res) => {
    const user_id = req.user.id;
    var sql = `   
    SELECT i.id,i.item,i.received_from,i.received_contact,i.signature,i.photo, DATE_FORMAT(i.created_at, '%d %b %Y') AS created_at,u.first_name as client_name,h.first_name as handover,nmf.case_id
FROM inward as i 
left join users as u on u.id =i.clientid
left join users as h on h.id = i.handover
left join new_mst_file as nmf on nmf.id = i.project
WHERE i.is_deleted =0 and i.handover = ? or i.created_by = ?`;

    db.query(sql, [user_id, user_id], function (err, result) {
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
  },

  deleteInward: function (req, res) {
    var id = req.body.id;
    req.assert("id", "Inward Id required.").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      const user_id = req.user.id;

      var sql =
        "UPDATE `inward` SET `is_deleted`=1,`updated_by`=" +
        parseInt(user_id) +
        ",`updated_at`='" +
        getCurrentDateAndTime() +
        "' WHERE `id`=" +
        id +
        "";

      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          res.status(201).json({
            error: false,
            message: "Inward has been Removed!",
            data: {},
          });
        }
      });
    }
  },

  AddOutward: function (req, res) {
    const files = [];
    let signature = req.body?.signature || "";
    let photo = req.body?.photo || "";

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "signature") {
          signature = getImageWithFoldername(file.path);
          files.push(signature);
        } else if (file.fieldname === "photo") {
          photo = getImageWithFoldername(file.path);
          files.push(photo);
        } else {
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(file.path);
          }
        }
      });
    }

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const inward = {
      clientid: this_data.clientId ? parseInt(this_data.clientId) : null,
      project: this_data.project ? parseInt(this_data.project) : null,
      item: this_data.item,
      received_from: this_data.received_from || null,
      received_contact: this_data.received_contact || null,
      collected: this_data.collected ? parseInt(this_data.collected) : null,
      signature: signature,
      photo: photo,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO outward SET ?", inward, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      return res.status(201).json({
        error: false,
        message: "Outward has been added successfully.",
        data: { id: result.insertId },
      });
    });
  },

  fetchoutwardAdminList: (req, res) => {
    var sql = `   
    SELECT i.id,i.item,i.received_from,i.received_contact,i.signature,i.photo, DATE_FORMAT(i.created_at, '%d %b %Y') AS created_at,u.first_name as client_name,h.first_name as collected,nmf.case_id
FROM outward as i 
left join users as u on u.id =i.clientid
left join users as h on h.id = i.collected
left join new_mst_file as nmf on nmf.id = i.project
WHERE i.is_deleted =0
ORDER BY i.id DESC`;

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
          res.status(200).json({
            error: false,
            message: "No records found",
            data: [],
          });
        }
      }
    });
  },

  fetchOutwardTeamList: (req, res) => {
    const user_id = req.user ? req.user.id : 0;
    var sql = `   
    SELECT i.id,i.item,i.received_from,i.received_contact,i.signature,i.photo, DATE_FORMAT(i.created_at, '%d %b %Y') AS created_at,u.first_name as client_name,h.first_name as collected,nmf.case_id
FROM outward as i 
left join users as u on u.id =i.clientid
left join users as h on h.id = i.collected
left join new_mst_file as nmf on nmf.id = i.project
WHERE i.is_deleted = 0 AND (i.collected = ? OR i.created_by = ?)
ORDER BY i.id DESC`;

    db.query(sql, [user_id, user_id], function (err, result) {
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
          res.status(200).json({
            error: false,
            message: "No records found",
            data: [],
          });
        }
      }
    });
  },

  deleteOutWard: function (req, res) {
    var id = req.body.id;
    if (!id) {
      return res.status(400).json({ error: true, message: "Outward ID is required", data: {} });
    }

    const user_id = req.user ? req.user.id : null;

    var sql = "UPDATE `outward` SET `is_deleted`=1, `updated_by`=?, `updated_at`=? WHERE `id`=?";

    db.query(sql, [user_id, getCurrentDateAndTime(), parseInt(id)], function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "Outward has been removed!",
          data: {},
        });
      }
    });
  },

};
