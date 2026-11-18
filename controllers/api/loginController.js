var mdl_common = require("./../../models/mdl_common");
module.exports = {
  signup: function (req, res) {
    var email = req.body.email;
    var password = req.body.password;

    req.assert("first_name", "first_name name required.").notEmpty();
    req.assert("last_name", "last_name name required.").notEmpty();
    if (typeof req.body.phone != "undefined" && req.body.phone != "") {
      req.assert("phone", "Phone should be number.").isNumeric();
      req
        .assert("phone", "Phone length should be 10 digit.")
        .isLength({ min: 10, max: 10 });
    }
    req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
    req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();
    req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();
    req
      .assert("confirm_password", messageClass.VALIDATION.CONFIRM_PASSWORD)
      .notEmpty();
    req
      .assert(
        "confirm_password",
        messageClass.VALIDATION.CONFIRM_PASSWORD_NOT_MATCH
      )
      .equals(password);
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      //check email exists
      var sql = "SELECT * FROM `users` WHERE `email`= '" + email + "' ";
      db.query(sql, function (err, result) {
        if (err) {
          var data = {
            error: true,
            message: err.sqlMessage,
            data: new Object(),
          };
          res.status(201).send(data);
        } else if (result.length > 0) {
          var data = {
            error: true,
            message: messageClass.RESPONSE.EMAIL_EXISTS,
            data: new Object(),
          };
          res.status(201).send(data);
        } else {
          var salt = bcrypt.genSaltSync(10);
          password = bcrypt.hashSync(password, salt);
          var users = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: email,
            password: password,
            username: "",
            phone: req.body.phone != "" ? req.body.phone : "",
            country_id:
              typeof req.body.country_id != "undefined" &&
              req.body.country_id != ""
                ? req.body.country_id
                : 0,
            city_id:
              typeof req.body.city_id != "undefined" && req.body.city_id != ""
                ? req.body.city_id
                : 0,
            state_id:
              typeof req.body.state_id != "undefined" && req.body.state_id != ""
                ? req.body.state_id
                : 0,
            street:
              typeof req.body.street != "undefined" && req.body.street != ""
                ? req.body.street
                : "",
            zip_code:
              typeof req.body.zip_code != "undefined" && req.body.zip_code != ""
                ? req.body.zip_code
                : "",
            active: 1,
            address: "",
            description: "",
            profile_picture: "",
            updated_at: new Date(),
          };
          //Register user
          db.query("INSERT INTO users SET ?", users, function (err, result) {
            if (err) {
              var data = {
                error: true,
                message: err.sqlMessage,
                data: new Object(),
              };
              res.status(201).send(data);
            } else {
              $sql =
                "SELECT `users`.`comp_id`,`users`.`id`,`users`.`first_name`,`users`.`last_name`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at` FROM `users`" +
                "LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id`" +
                "LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id`" +
                "LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id`" +
                " WHERE `users`.`id`='" +
                result.insertId +
                "'";
              db.query($sql, async function (err, user) {
                if (err) {
                  var data = {
                    error: true,
                    message: err.sqlMessage,
                    data: new Object(),
                  };
                  res.status(201).send(data);
                } else {
                  var token = await jwt.sign(
                    { id: user[0].id, comp_id: user[0].comp_id },
                    meta.thekey,
                    { expiresIn: "3h" }
                  );
                  user[0].phone =
                    user[0].phone != null && user[0].phone != ""
                      ? user[0].phone
                      : "";
                  user[0].country_name =
                    user[0].country_name != null && user[0].country_name != ""
                      ? user[0].country_name
                      : "";
                  user[0].state_name =
                    user[0].state_name != null && user[0].state_name != ""
                      ? user[0].state_name
                      : "";
                  user[0].city_name =
                    user[0].city_name != null && user[0].city_name != ""
                      ? user[0].city_name
                      : "";
                  user[0].street =
                    user[0].street != null && user[0].street != ""
                      ? user[0].street
                      : "";
                  user[0].zip_code =
                    user[0].zip_code != null && user[0].zip_code != ""
                      ? user[0].zip_code
                      : "";
                  user[0].address =
                    user[0].address != null && user[0].address != ""
                      ? user[0].address
                      : "";
                  user[0].username =
                    user[0].username != null && user[0].username != ""
                      ? user[0].username
                      : "";
                  user[0].description =
                    user[0].description != null && user[0].description != ""
                      ? user[0].description
                      : "";

                  var data = {
                    error: false,
                    message: "Register successfully.",
                    data: user[0],
                  };
                  data.token = await token;

                  res.status(201).send(data);
                }
              });
            }
          });
        }
      });
    }
  },
  signin: async function (req, res) {
    //Simple Login
    var email = req.body.email; //username or email
    var password = req.body.password;
    req.assert("email", "Email or username required.").notEmpty();
    req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      var sql =
        "SELECT `mst_group_id`as role_id,`mst_groups`.`name` as `role`,`users`.`comp_id`,`users`.`id`,`users`.`password`,`users`.`active`,`users`.`first_name`,`users`.`last_name`,concat(`users`.`first_name`,' ',`users`.`last_name`) as `fullname`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture`,`users`.`isdeleted` FROM `users` LEFT JOIN `users_groups` ON `users_groups`.`mst_user_id`=`users`.`id` LEFT JOIN `mst_groups` ON `mst_groups`.`id`=`users_groups`.`mst_group_id` LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id` LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id` LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id` WHERE `users`.`email`='" +
        email +
        "'";
      db.query(sql, async function (err, result, fields) {
        if (err) {
          console.log("Here is error");
          var data = {
            error: true,
            message: err.sqlMessage,
            data: new Object(),
          };
          res.status(201).send(data);
        } else {
          if (result.length > 0) {
            if (bcrypt.compareSync(password, result[0].password)) {
              if (result[0].active == 1) {
                result[0].role_id = result[0].role_id ? result[0].role_id : "";
                result[0].role = result[0].role ? result[0].role : "";
                result[0].phone =
                  result[0].phone != null && result[0].phone != ""
                    ? result[0].phone
                    : "";
                result[0].country_name =
                  result[0].country_name != null && result[0].country_name != ""
                    ? result[0].country_name
                    : "";
                result[0].state_name =
                  result[0].state_name != null && result[0].state_name != ""
                    ? result[0].state_name
                    : "";
                result[0].city_name =
                  result[0].city_name != null && result[0].city_name != ""
                    ? result[0].city_name
                    : "";
                result[0].street =
                  result[0].street != null && result[0].street != ""
                    ? result[0].street
                    : "";
                result[0].zip_code =
                  result[0].zip_code != null && result[0].zip_code != ""
                    ? result[0].zip_code
                    : "";
                result[0].address =
                  result[0].address != null && result[0].address != ""
                    ? result[0].address
                    : "";
                result[0].username =
                  result[0].username != null && result[0].username != ""
                    ? result[0].username
                    : "";
                result[0].description =
                  result[0].description != null && result[0].description != ""
                    ? result[0].description
                    : "";

                var token = jwt.sign(
                  {
                    id: result[0].id,
                    role: result[0].role,
                    comp_id: result[0].comp_id,
                  },
                  meta.thekey,
                  { expiresIn: "3h" }
                );
                // Fetch company logo from mst_company if available
                db.query("SELECT logo, comp_name FROM mst_company LIMIT 1", function(compErr, compRes) {
                  if (!compErr && compRes && compRes.length > 0) {
                    result[0].company_logo = compRes[0].logo || "";
                    if (!result[0].firm_name) {
                      result[0].firm_name = compRes[0].comp_name || "";
                    }
                  }
                  var data = {
                    error: false,
                    message: messageClass.RESPONSE.LOGIN_SUCCESS,
                    data: result[0],
                  };
                  data.token = token;
                  delete data.data.password;
                  delete data.data.active;

                  res.status(201).send(data);
                });
              } else {
                var data = {
                  error: true,
                  message: "Account is Inactive.",
                  data: new Object(),
                };
                res.status(201).send(data);
              }
            } else {
              var data = {
                error: true,
                message:
                  "The email or username that you have entered does not match.",
                data: new Object(),
              };
              res.status(201).send(data);
            }
          } else {
            let sql =
              "SELECT `mst_groups`.`name` as `role`,`users`.`comp_id`,`users`.`id`,`users`.`password`,`users`.`active`,`users`.`first_name`,`users`.`last_name`,concat(`users`.`first_name`,'',`users`.`last_name`) as `fullname`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture` FROM `users`" +
              "LEFT JOIN `users_groups` ON `users_groups`.`mst_user_id`=`users`.`id`" +
              "LEFT JOIN `mst_groups` ON `mst_groups`.`id`=`users_groups`.`mst_group_id`" +
              "LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id`" +
              "LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id`" +
              "LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id`" +
              " WHERE `users`.`username`='" +
              email +
              "'";
            db.query(sql, async function (err, result) {
              if (err) {
                console.log(sql);
                console.log("Error from here");
                var data = {
                  error: true,
                  message: err.sqlMessage,
                  data: new Object(),
                };
                res.status(201).send(data);
              } else {
                if (result.length > 0) {
                  if (bcrypt.compareSync(password, result[0].password)) {
                    if (result[0].active == 1) {
                      result[0].role = result[0].role ? result[0].role : "";
                      result[0].phone =
                        result[0].phone != null && result[0].phone != ""
                          ? result[0].phone
                          : "";
                      result[0].country_name =
                        result[0].country_name != null &&
                        result[0].country_name != ""
                          ? result[0].country_name
                          : "";
                      result[0].state_name =
                        result[0].state_name != null &&
                        result[0].state_name != ""
                          ? result[0].state_name
                          : "";
                      result[0].city_name =
                        result[0].city_name != null && result[0].city_name != ""
                          ? result[0].city_name
                          : "";
                      result[0].street =
                        result[0].street != null && result[0].street != ""
                          ? result[0].street
                          : "";
                      result[0].zip_code =
                        result[0].zip_code != null && result[0].zip_code != ""
                          ? result[0].zip_code
                          : "";
                      result[0].address =
                        result[0].address != null && result[0].address != ""
                          ? result[0].address
                          : "";
                      result[0].username =
                        result[0].username != null && result[0].username != ""
                          ? result[0].username
                          : "";
                      result[0].description =
                        result[0].description != null &&
                        result[0].description != ""
                          ? result[0].description
                          : "";
                      db.query(
                        "SELECT (SELECT COUNT(id) as count FROM following WHERE user_id='" +
                          result[0].id +
                          "') as following,(SELECT COUNT(id) as count FROM following WHERE following_id = '" +
                          result[0].id +
                          "') as followers",
                        async function (err, follow) {
                          if (err) {
                            var data = {
                              error: true,
                              message: err.sqlMessage,
                              data: new Object(),
                            };
                            res.status(201).send(data);
                          } else {
                            //console.log(follow[0]);
                            var token = jwt.sign(
                              {
                                id: result[0].id,
                                role: result[0].role,
                                comp_id: result[0].comp_id,
                              },
                              meta.thekey,
                              { expiresIn: "3h" }
                            );
                            var data = {
                              error: false,
                              message: messageClass.RESPONSE.LOGIN_SUCCESS,
                              data: result[0],
                            };
                            data.token = token;

                            res.status(201).send(data);
                          }
                        }
                      );
                    } else {
                      var data = {
                        error: true,
                        message: "Account is Inactive.",
                        data: new Object(),
                      };
                      res.status(201).send(data);
                    }
                  } else {
                    var data = {
                      error: true,
                      message:
                        "The email  or username that you have entered does not match.",
                      data: new Object(),
                    };
                    res.status(201).send(data);
                  }
                } else {
                  var data = {
                    error: true,
                    message: "Email or username does not exist.",
                    data: new Object(),
                  };
                  res.status(201).send(data);
                }
              }
            });
          }
        }
      });
    }
  },
  login: async (req, res) => {
    try {
      const email = req.body.email ? req.body.email.trim() : "";
      const password = req.body.password;
      const device_token = req.body.device_token;
      const companyCodeInput = req.body.company_code ? req.body.company_code.trim() : (req.headers["x-company-code"] || null);

      req.assert("email", "Email or username required.").notEmpty();
      req.assert("password", messageClass.VALIDATION.PASSWORD).notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        return res.status(200).json({ message: errors[0].msg, error: true, data: {} });
      }

      // ── Resolve Tenant Database ──
      const mysqlPromise = require("mysql2/promise");
      const { masterDbConfig } = require("../super_admin/authController");
      const { getTenantPool } = require("../../services/tenantDbManager");

      let tenantCompany = null;
      let targetDb = "tarsha";

      try {
        const masterConn = await mysqlPromise.createConnection(masterDbConfig);
        
        // 1. If explicit company code provided
        if (companyCodeInput) {
          const [matched] = await masterConn.query(
            "SELECT id, code, name, logo, db_name, features, is_active FROM companies WHERE LOWER(code) = ? AND is_active = 1",
            [companyCodeInput.toLowerCase()]
          );
          if (matched.length > 0) {
            tenantCompany = matched[0];
            targetDb = tenantCompany.db_name;
          }
        }

        // 2. Auto-locate company by email across tenant databases
        if (!tenantCompany) {
          const [allCompanies] = await masterConn.query(
            "SELECT id, code, name, logo, db_name, features, is_active FROM companies WHERE is_active = 1 ORDER BY id DESC"
          );

          for (const comp of allCompanies) {
            if (!comp.db_name) continue;
            try {
              const testPool = getTenantPool(comp.db_name);
              const exists = await new Promise((resolve) => {
                testPool.query("SELECT id FROM users WHERE (email = ? OR username = ?) AND isdeleted = 0 LIMIT 1", [email, email], (err, r) => {
                  resolve(!err && r && r.length > 0);
                });
              });
              if (exists) {
                tenantCompany = comp;
                targetDb = comp.db_name;
                break;
              }
            } catch (poolErr) {
              // Ignore and test next
            }
          }
        }

        await masterConn.end();
      } catch (lookupErr) {
        console.error("[LOGIN] Notice on company lookup:", lookupErr.message);
      }

      const targetPool = getTenantPool(targetDb);
      console.log(`[LOGIN] Authenticating user "${email}" in tenant database: ${targetDb}`);

      var sql =
        "SELECT `mst_group_id` as role_id, `mst_groups`.`name` as `role`, `users`.`comp_id`, `users`.`id`, `users`.`password`, `users`.`active`, `users`.`first_name`, `users`.`last_name`, concat(`users`.`first_name`,' ',`users`.`last_name`) as `fullname`, `email`, `username`, `phone`, `users`.`country_id`, `countries`.`name` as `country_name`, `users`.`state_id`, `states`.`name` as `state_name`, `users`.`city_id`, `cities`.`name` as `city_name`, `street`, `address`, `users`.`description`, `zip_code`, `users`.`created_at`, `users`.`updated_at`, `users`.`profile_picture`, `users`.`isdeleted`, `users`.`device_token` FROM `users` LEFT JOIN `users_groups` ON `users_groups`.`mst_user_id`=`users`.`id` LEFT JOIN `mst_groups` ON `mst_groups`.`id`=`users_groups`.`mst_group_id` LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id` LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id` LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id` WHERE (`users`.`email`= ? OR `users`.`username`= ?) AND `users`.`isdeleted`=0";

      targetPool.query(sql, [email, email], (err, result) => {
        if (err) {
          return res.status(200).json({ message: err.sqlMessage, error: true, data: {} });
        }
        if (!result || result.length === 0) {
          return res.status(200).json({ message: "Username doesn't exist", error: true, data: {} });
        }

        if (!bcrypt.compareSync(password, result[0]?.password)) {
          return res.status(200).json({ message: "Invalid Username/Password", error: true, data: {} });
        }

        if (parseInt(result[0]?.active) !== 1) {
          return res.status(200).json({ message: "Account is Inactive", error: true, data: {} });
        }

        const user_roles = result.map((r) => r?.role || "admin");
        const effectiveRole = result[0].role || "admin";

        const token = jwt.sign(
          {
            id: result[0].id,
            user_roles: user_roles,
            role: effectiveRole,
            comp_id: result[0].comp_id,
            db_name: targetDb,
            company_code: tenantCompany?.code || null,
          },
          meta.thekey,
          { expiresIn: "3h" }
        );

        if (device_token) {
          const updateTokenSql = "UPDATE users SET device_token = ? WHERE id = ?";
          targetPool.query(updateTokenSql, [device_token, result[0].id], () => {});
        }

        let parsedFeatures = [];
        try {
          parsedFeatures = typeof tenantCompany?.features === "string" ? JSON.parse(tenantCompany.features) : tenantCompany?.features || [];
        } catch (e) {
          parsedFeatures = [];
        }

        const data = {
          id: result[0]?.id || "",
          image_path: "https://webapp.zaidexceldesign.com/",
          role_id: result[0]?.role_id || 1,
          role: effectiveRole,
          user_roles: user_roles,
          phone: result[0]?.phone || "",
          first_name: result[0]?.first_name || "",
          last_name: result[0]?.last_name || "",
          fullname: result[0]?.fullname || "",
          email: result[0]?.email || "",
          username: result[0]?.username || "",
          profile_picture: result[0]?.profile_picture || "",
          token: token,
          device_token: device_token || "",
          db_name: targetDb,
          company_code: tenantCompany?.code || "",
          company_logo: tenantCompany?.logo || "",
          firm_name: tenantCompany?.name || result[0].firm_name || "",
          features: parsedFeatures,
        };

        return res.status(200).json({
          message: messageClass.RESPONSE.LOGIN_SUCCESS,
          error: false,
          data: data,
        });
      });
    } catch (err) {
      console.error("[LOGIN ERROR]", err);
      return res.status(200).json({ message: "Server error: " + err.message, error: true, data: {} });
    }
  },
  getAllcountries: function (req, res) {
    var sql = "SELECT * FROM `countries`";
    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: new Object() };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = { error: false, message: "Successfully", data: result };
          res.status(201).send(data);
        } else {
          var data = {
            error: false,
            message: "Record not found.",
            data: new Array(),
          };
          res.status(201).send(data);
        }
      }
    });
  },
  getAllstates: function (req, res) {
    var country_id = req.body.country_id;
    if (typeof country_id !== "undefined" && country_id !== "") {
      var sql =
        "SELECT * FROM `states` WHERE `country_id`='" + country_id + "'";
    } else {
      var sql = "SELECT * FROM `states`";
    }
    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: new Object() };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = { error: false, message: "Successfully", data: result };
          res.status(201).send(data);
        } else {
          var data = {
            error: false,
            message: "Record not found.",
            data: new Array(),
          };
          res.status(201).send(data);
        }
      }
    });
  },
  getAllcities: function (req, res) {
    var state_id = req.body.state_id;
    if (typeof state_id !== "undefined" && state_id !== "") {
      var sql = "SELECT * FROM `cities` WHERE `state_id`='" + state_id + "'";
    } else {
      var sql = "SELECT * FROM `cities`";
    }
    db.query(sql, function (err, result) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: new Object() };
        res.status(201).send(data);
      } else {
        if (result.length > 0) {
          var data = { error: false, message: "Successfully", data: result };
          res.status(201).send(data);
        } else {
          var data = {
            error: false,
            message: "Record not found.",
            data: new Array(),
          };
          res.status(201).send(data);
        }
      }
    });
  },
};
