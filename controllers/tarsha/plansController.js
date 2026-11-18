const getCurrentDateAndTime = require("../helpers/utils");
const db = require("../config/db");
module.exports = {
  add: function (req, res) {
    // const user_id = req.user ? req.user.id : null;
    const user_id = 1;
    const this_data = req.body;
    console.log("this_data==>", this_data);

    const plans = {
      title: this_data.title,
      support_text: this_data.support_text,
      gst: this_data.gst,
      max_user_allow: this_data.max_user_allow,
      max_customer: this_data.max_customer,
      max_file: this_data.max_file,
      max_upload_size: this_data.max_upload_size,
      price_per_month: this_data.price_per_month,
      sell_price_per_month: this_data.sell_price_month,
      price_per_year: this_data.price_per_year,
      sell_price_year: this_data.sell_price_year,
      price_for_2year: this_data.price_for_2year,
      sell_price_for_2year: this_data.sell_price_for_2year,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("plans==>", plans);

    db.query("INSERT INTO mst_plans SET ?", plans, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      // If insertion is successful, you can send a success response here
      const data = {
        error: false,
        message: "plans has been added successfully.",
        data: {
          id: result.insertId,
          // Include any other relevant data you want to send
        },
      };
      res.status(201).json(data);
    });
  },

  Plansadd: function (req, res) {
    // const user_id = req.user ? req.user.id : null;
    const user_id = 1;
    const this_data = req.body;
    console.log("this_data==>", this_data);

    const plan = {
      status: this_data.active,
      plans_id: this_data.plans,
      user_id: this_data.user_id,
      start_date: this_data.start_date,
      expiry_date: this_data.enddate,
      duration: this_data.duration,
      comp_id: this_data.comp_id,
      gst: this_data.gst,
      // max_admin_allow: this_data.max_admin_allow,
      max_users_allow: this_data.max_user_allow,
      max_customer: this_data.max_customer,
      max_file: this_data.max_file,
      max_upload_size: this_data.max_upload_size,
      price: this_data.netAmount,
      final_price: this_data.finalPrice,
      discount_price: this_data.discount_price,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };

    // console.log("plan==>", plan);

    db.query("INSERT INTO company_plans SET ?", plan, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      // If insertion is successful, you can send a success response here
      const data = {
        error: false,
        message: "plans has been added successfully.",
        data: {
          id: result.insertId,
          // Include any other relevant data you want to send
        },
      };
      res.status(201).json(data);
    });
  },

  getplans: async function (req, res) {
    var sql = "SELECT * FROM mst_plans where is_deleted =0";

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

  getplansbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql =
          "select * from company_plans where is_deleted = 0 and user_id = ?";

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(500)
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
          .status(400)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  deletePlans: function (req, res) {
    const plansid = req.params.id;

    // const id = req.user.id;
    const id = 1;

    var sql =
      "UPDATE `company_plans` SET `is_deleted`= 1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      plansid +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "plans has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getpastplans: (req, res) => {
    try {
      const id = req.params.id;
      console.log("reqiuu==>", id);

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql =
          "select * from company_plans where is_deleted = 0 and user_id = ? ORDER BY expiry_date DESC  LIMIT 1";

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(500)
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
          .status(400)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },

  getplans: async function (req, res) {
    var sql = "SELECT * FROM mst_plans where is_deleted =0";

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

  deletemstPlans: function (req, res) {
    const plansid = req.params.id;

    // const id = req.user.id;
    const id = 1;

    var sql =
      "UPDATE `mst_plans` SET `is_deleted`= 1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      plansid +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "mst plans has been marked as deleted!",
          data: {},
        });
      }
    });
  },

  getmstplansbyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (!isNaN(parseInt(id))) {
        // Check if id is a valid number
        var sql = "select * from mst_plans where is_deleted = 0 and id = ?";

        db.query(sql, [id], (err, result) => {
          if (err) {
            res
              .status(500)
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
          .status(400)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Invalid request", error: true, data: {} });
    }
  },
  updatemstPlans: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var sql = "SELECT *from `Plans` WHERE `id`=" + parseInt(this_data.id) + "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        // const user_id = req?.user?.id;
        const user_id = 1;
        const id = this_data?.id;

        const Plans = {
          title: this_data.title,
          support_text: this_data.support_text,
          max_user_allow: this_data.max_user_allow,
          max_customer: this_data.max_customer,
          max_file: this_data.max_file,
          max_upload_size: this_data.max_upload_size,
          price_per_month: this_data.price_per_month,
          sell_price_per_month: this_data.sell_price_per_month,
          price_per_year: this_data.price_per_year,
          sell_price_year: this_data.sell_price_year,
          price_for_2year: this_data.price_for_2year,
          sell_price_for_2year: this_data.sell_price_for_2year,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.id); // Just before the db.query call

        console.log("Plans===>", Plans);
        const updateSql =
          "UPDATE `mst_plans` SET " +
          "`title`='" +
          Plans.title +
          "'," +
          "`support_text`='" +
          Plans.support_text +
          "'," +
          "`max_user_allow`='" +
          Plans.max_user_allow +
          "'," +
          "`max_customer`='" +
          Plans.max_customer +
          "'," +
          "`max_file`='" +
          Plans.max_file +
          "'," +
          "`max_upload_size`='" +
          Plans.max_upload_size +
          "'," +
          "`price_per_month`='" +
          Plans.price_per_month +
          "'," +
          "`sell_price_per_month`='" +
          Plans.sell_price_per_month +
          "'," +
          "`price_per_year`='" +
          Plans.price_per_year +
          "'," +
          "`sell_price_year`='" +
          Plans.sell_price_year +
          "'," +
          "`price_for_2year`='" +
          Plans.price_for_2year +
          "'," +
          "`sell_price_for_2year`='" +
          Plans.sell_price_for_2year +
          "'," +
          "`updated_at`='" +
          Plans.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(Plans.updated_by) +
          " WHERE `id`=" +
          id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Mst Plans has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },
};
