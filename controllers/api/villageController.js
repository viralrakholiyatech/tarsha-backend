module.exports = {
  add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const village = {
      name: this_data.name,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    db.query("INSERT INTO village SET ?", village, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Vilage has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  getVillage: async function (req, res) {
    var sql = "SELECT * from village where is_deleted = 0 order by name asc";

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

  getVillageById: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT * from village WHERE `is_deleted`=0 and id=" +
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
    const selectSql = "SELECT * FROM `village` WHERE `id` = ?";
    
    db.query(selectSql, [id], (err, result) => {
        if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
        }

        console.log(result);

        const user_id = req?.user?.id;

        const village = {
            name: this_data.name,
            updated_at: getCurrentDateAndTime(),
            updated_by: user_id,
        };

        const updateSql = 
            "UPDATE `village` SET " +
            "`name` = ?, " +
            "`updated_at` = ?, " +
            "`updated_by` = ? " +
            "WHERE `id` = ?";

        // console.log("updateSql", updateSql);

        db.query(updateSql, [village.name, village.updated_at, parseInt(village.updated_by), id], (err, result) => {
            if (err) {
                const data = { error: true, message: err.sqlMessage, data: {} };
                return res.status(500).json(data); // Use 500 for server errors
            }

            const response = {
                error: false,
                message: "Village has been updated...",
                data: {},
            };

            res.status(200).json(response); // Use 200 for successful updates
        });
    });
},

deleteVillage: function (req, res) {
    const villageId = req.body.id;


    const id = req.user.id;

    var sql =
      "UPDATE `village` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      villageId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "village has been marked as deleted!",
          data: {},
        });
      }
    });
  },

};
