module.exports = {
  add: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    const tpscheme = {
      village: this_data.village,
      tpscheme: this_data.tpscheme,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      is_deleted: 0,
    };
    console.log("tpscheme ==>", tpscheme);

    db.query("INSERT INTO tpscheme  SET ?", tpscheme, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "tpscheme has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data);
    });
  },

  getTpscheme: async function (req, res) {
    var sql =
      "SELECT t.id,t.village,t.tpscheme,v.name from tpscheme as t left join village as v on v.id= t.village where t.is_deleted = 0 order by tpscheme asc";

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

  getTpschemeById: (req, res) => {
    var id = parseInt(req.params.id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT * from tpscheme WHERE `is_deleted`=0 and id=" +
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
    const selectSql = "SELECT * FROM `tpscheme` WHERE `id` = ?";

    db.query(selectSql, [id], (err, result) => {
      if (err) {
        const data = { error: true, message: err.sqlMessage, data: {} };
        return res.status(500).json(data); // Use 500 for server errors
      }

      console.log(result);

      const user_id = req?.user?.id;

      const tpscheme = {
        village: this_data.village,
        tpscheme: this_data.tpscheme,
        updated_at: getCurrentDateAndTime(),
        updated_by: user_id,
      };

      const updateSql =
        "UPDATE `tpscheme` SET " +
        "`village` = ?, " +
        "`tpscheme` = ?, " +
        "`updated_at` = ?, " +
        "`updated_by` = ? " +
        "WHERE `id` = ?";

      // console.log("updateSql", updateSql);

      db.query(
        updateSql,
        [
          tpscheme.village,
          tpscheme.tpscheme,
          tpscheme.updated_at,
          parseInt(tpscheme.updated_by),
          id,
        ],
        (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            return res.status(500).json(data); // Use 500 for server errors
          }

          const response = {
            error: false,
            message: "tpscheme has been updated...",
            data: {},
          };

          res.status(200).json(response); // Use 200 for successful updates
        }
      );
    });
  },

  deletTpscheme: function (req, res) {
    const tpschemeId = req.body.id;
    console.log("tpschemeId->", tpschemeId);

    const id = req.user.id;

    var sql =
      "UPDATE `tpscheme` SET `is_deleted`=1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      tpschemeId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "tpscheme has been marked as deleted!",
          data: {},
        });
      }
    });
  },
};
