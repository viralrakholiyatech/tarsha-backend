
module.exports = {
  add: function (req, res) {
    const user_id = 1; // Assuming user ID is fixed for now
    const this_data = req.body;

    // console.log("file--->", req.files);

    const hashedPassword = bcrypt.hashSync(this_data.password, 10);

    const planObject = JSON.parse(this_data.plan);


    const userData = {
      first_name: this_data.first_name,
      email: this_data.email,
      phone: this_data.phone,
      password: hashedPassword,
      active: this_data.active,
      firm_name: this_data.firm_name,
      firm_logo: req.files[0].filename,
      username: this_data.email,
      comp_id: null,
      plans: this_data.plans,
      duration: this_data.duration,
      plan_start: this_data.plan_start_date,
      plan_expiry: this_data.enddate,
      payment_status: this_data.payment_status,
      plan_status: this_data.plan_status,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      isdeleted: 0,
    };

    const companyData = {
      plans_id: planObject.id,
      logo: req.files[0].filename, // Assuming this_data.file contains the firm logo
      team_members: planObject.max_user_allow, // Assuming max_user_allow is the number of team members from the plan
      name: this_data.firm_name,
      created_at: getCurrentDateAndTime(),
      created_by: user_id,
      is_deleted: 0,
    };

    const planData = {
      // Extract plan data from req.body.plan
      // Adjust these fields according to your plan table schema
      user_id: null,
      comp_id: null,
      plans_id: planObject.id,
      start_date: this_data.plan_start_date,
      expiry_date: this_data.enddate,
      gst: this_data.gst,
      discount_price: this_data.discount_price,
      final_price: this_data.final_price,
      duration: this_data.duration,
      max_users_allow: planObject.max_user_allow,
      max_customer: planObject.max_customer,
      max_file: planObject.max_file,
      max_upload_size: planObject.max_upload_size,
      price: planObject.price_per_month,

      status: planObject.status,
      created_at: getCurrentDateAndTime(),
      is_deleted: 0,
    };

    const usergroup = {
      mst_user_id: null, // Placeholder for user ID
      mst_group_id: 1,
    };

    db.beginTransaction(function (err) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      db.query(
        "INSERT INTO company SET ?",
        companyData,
        function (err, companyResult) {
          if (err) {
            db.rollback(function () {
              return res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            });
          }

          const companyId = companyResult.insertId;
          planData.comp_id = companyId; // Assigning company ID to planData
          userData.comp_id = companyId;

          db.query(
            "INSERT INTO users SET ?",
            userData,
            function (err, userResult) {
              if (err) {
                console.error("Error executing SQL query:", err);
                db.rollback(function () {
                  return res
                    .status(500)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                });
              }

              const userId = userResult.insertId; // Retrieve the inserted user ID

              usergroup.mst_user_id = userId; // Assign user ID to usergroup object

              const companyUserId = userId;
              planData.user_id = companyUserId; // Assigning user ID to planData

              db.query(
                "INSERT INTO company_plans SET ?",
                planData,
                function (err, planResult) {
                  if (err) {
                    db.rollback(function () {
                      return res.status(500).json({
                        error: true,
                        message: err.sqlMessage,
                        data: {},
                      });
                    });
                  }

                  db.query(
                    "INSERT INTO users_groups SET ?",
                    usergroup,
                    function (err, usergroupResult) {
                      if (err) {
                        db.rollback(function () {
                          return res.status(500).json({
                            error: true,
                            message: err.sqlMessage,
                            data: {},
                          });
                        });
                      }

                      db.commit(function (err) {
                        if (err) {
                          db.rollback(function () {
                            return res.status(500).json({
                              error: true,
                              message: err.sqlMessage,
                              data: {},
                            });
                          });
                        }

                        const data = {
                          error: false,
                          message: "Company has been added successfully.",
                          data: {
                            user_id: companyUserId,
                            company_id: companyId,
                            plan_id: planResult.insertId,
                          },
                        };
                        res.status(201).json(data);
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  },

  UpdateCompany: function (req, res) {
    // const this_data = JSON.parse(JSON.stringify(req.body));
    const this_data = req.body;
    console.log("Request Body:", this_data);
    const file = req.file;

    console.log("Request file:", req);
    var sql = "SELECT *from `users` WHERE `id`=" + parseInt(this_data.id) + "";

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        // const user_id = req?.user?.id;
        const user_id = 1;
        const id = this_data?.id;

        const company = {
          first_name: this_data.first_name,
          email: this_data.email,
          phone: this_data.phone,
          active: this_data.active,
          firm_name: this_data.firm_name,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
    
        const updateSql =
          "UPDATE `users` SET " +
          "`first_name`='" +
          company.first_name +
          "'," +
          "`email`='" +
          company.email +
          "'," +
          "`phone`='" +
          company.phone +
          "'," +
          "`active`='" +
          company.active +
          "'," +
          "`firm_name`='" +
          company.firm_name +
          "'," +
          "`updated_at`='" +
          company.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(company.updated_by) +
          " WHERE `id`=" +
          id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Comapny has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },

  getcompanybyid: (req, res) => {
    try {
      const id = req.params?.id;

      if (parseInt(id) != NaN) {
        var sql =
          "select  id,comp_id,firm_name,first_name,email,password,username,phone,active,firm_logo,duration,plan_start,plan_expiry,payment_status,plans,plan_status,created_at,updated_at from users   where isdeleted = 0   and id=" +
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

  getcompanylist: async function (req, res) {
    var sql =
      "SELECT * FROM users where isdeleted = 0 AND firm_name IS NOT NULL";

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

  deletecompany: function (req, res) {
    const companyId = req.params.id;

    // const id = req.user.id;
    const id = 1;

    var sql =
      "UPDATE `users` SET `isdeleted`= 1,`updated_by`=" +
      parseInt(id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      companyId +
      "";

    db.query(sql, function (err, result) {
      if (err) {
        res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      } else {
        res.status(200).json({
          error: false,
          message: "company has been marked as deleted!",
          data: {},
        });
      }
    });
  },
};
