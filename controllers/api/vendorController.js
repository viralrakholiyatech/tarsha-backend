
module.exports = {


  add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const vendor = {
      name: this_data.name,
      mobile:this_data.mobile,
      created_at: getCurrentDateAndTime(),
      created_by:user_id,
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO vendors SET ?", vendor, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Vendors has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

    getVendors: async function (req, res) {
    var sql = "SELECT * from vendors where is_deleted = 0 order by name asc";

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

    getVendorsById: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT * from vendors WHERE `is_deleted`=0 and id=" +
        parseInt(id) +
        "";
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

  update: function (req, res) {
    const this_data = req.body;
    const id = parseInt(this_data.id);

    // Use parameterized queries to avoid SQL injection and syntax errors
    const selectSql = "SELECT * FROM `vendors` WHERE `id` = ?";
    
    db.query(selectSql, [id], (err, result) => {
        if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
        }

        console.log(result);

        const user_id = req?.user?.id;

        const vendor = {
            name: this_data.name,
              mobile:this_data.mobile,
            updated_at: getCurrentDateAndTime(),
            updated_by: user_id,
        };

        const updateSql = 
            "UPDATE `vendors` SET " +
            "`name` = ?, " +
              "`mobile` = ?, " +
            "`updated_at` = ?, " +
            "`updated_by` = ? " +
            "WHERE `id` = ?";

        // console.log("updateSql", updateSql);

        db.query(updateSql, [vendor.name,vendor.mobile, vendor.updated_at, parseInt(vendor.updated_by), id], (err, result) => {
            if (err) {
                const data = { error: true, message: err.sqlMessage, data: {} };
                return res.status(500).json(data); // Use 500 for server errors
            }

            const response = {
                error: false,
                message: "vendor has been updated...",
                data: {},
            };

            res.status(200).json(response); // Use 200 for successful updates
        });
    });
},

deleteVendor: function (req, res) {
    const vendorId = req.body.id;


    const id = req.user.id;

    var sql =
      "UPDATE `vendors` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      vendorId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "vendor has been marked as deleted!",
          data: {},
        });
      }
    });
  },

}