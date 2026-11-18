var mdl_common = require("./../../models/mdl_common");
var asyncLoop = require("node-async-loop");
const {
  unlinkSingleImage,
  getImageWithFoldername,
} = require("../../services/FileService");
module.exports = {
  add: function (req, res) {
    try {
      const custData = JSON.parse(JSON.stringify(req.body));

      const filePath = req?.file
        ? getImageWithFoldername(req?.file?.path)
        : (custData?.profile_picture || "");

      var email = custData.email;
      var password = custData.password;
      //var user_id = custData.user_id;
      req.assert("first_name", "First name required.").notEmpty();
      req.assert("last_name", "Last name required.").notEmpty();
      if (typeof custData.phone != "undefined" && custData.phone != "") {
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
      //req.assert('user_id','Unauthorised').notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        res.status(201).json({
          error: true,
          field: errors[0].param,
          message: errors[0].msg,
          data: {},
        });
      } else {
        const user_id = req?.user?.id;
        const comp_id = req?.user?.comp_id;
        let group_id = 0;
        var sql = "SELECT *from `mst_groups` WHERE `name`='Client'";
        db.query(sql, (err, result) => {
          if (err) {
            console.log(err);
          } else {
            group_id = result[0].id ? parseInt(result[0].id) : 0;
          }
        });

        //check email exists
        var sql =
          "SELECT * FROM `users` WHERE `email`= '" +
          email +
          "' and `isdeleted`=0";
        db.query(sql, function (err, result) {
          if (err) {
            res
              .status(201)
              .send({ error: true, message: err.sqlMessage, data: {} });
          } else if (result.length > 0) {
            res.status(201).json({
              error: true,
              message: "Email is already existed",
              data: {},
            });
          } else {
            var salt = bcrypt.genSaltSync(10);
            password = bcrypt.hashSync(password, salt);
            var users = {
              first_name: custData?.first_name,
              last_name: custData?.last_name,
              email: email,
              username: email,
              password: password,
              phone: custData?.phone != "" ? custData?.phone : "",
              profile_picture: filePath,
              active:1,
              comp_id: comp_id ? parseInt(comp_id) : 1,
              department_id: custData?.department_id
                ? custData?.department_id
                : 1,
              post_id: custData?.post_id ? custData?.post_id : 1,
              created_by: user_id,
              created_at: getCurrentDateAndTime(),
            };

            db.query("INSERT INTO `users` SET ?", users, (err, result) => {
              if (err) {
                if (filePath.trim().length > 0) {
                  unlinkSingleImage(filePath);
                }
                console.log(err);
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                if (group_id) {
                  const users_groups = {
                    mst_user_id: result.insertId,
                    mst_group_id: group_id,
                  };

                  db.query(
                    "INSERT INTO `users_groups` SET ?",
                    users_groups,
                    (err, result) => {
                      if (err) {
                        console.log(err);
                      }
                    }
                  );
                }

                res
                  .status(201)
                  .json({ error: false, message: "Customer added", data: {} });
              }
            });
          }
        });
      }
    } catch (err) {
      if (req?.file) {
        unlinkSingleImage(getImageWithFoldername(req?.file?.path));
      }
      res.status(201).json({
        error: true,
        message: "Unable to add the data, Something went wrong",
        data: {},
      });
    }
  },

  addClient: function (req, res) {
    try {
      const custData = req.body;
      var email = custData.email;
      var password = custData.password;
      const user_id = req?.user?.id;
      const comp_id = req?.user?.comp_id;

      let group_id = 0;
      var sql = "SELECT *from `mst_groups` WHERE `name`='Client'";
      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
        } else {
          group_id = result[0].id ? parseInt(result[0].id) : 0;
        }
      });

      //check email exists
      var sql =
        "SELECT * FROM `users` WHERE `email`= '" +
        email +
        "' and `isdeleted`=0";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(500)
            .send({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res.status(409).json({
            error: true,
            message: "Email is already existed",
            data: {},
          });
        } else {
          var salt = bcrypt.genSaltSync(10);
          password = bcrypt.hashSync(password, salt);
          var users = {
            first_name: custData?.first_name,
            password: password,
            company_name: custData?.company_name,
            email: email,
            username: email,
            phone: custData?.phone != "" ? custData?.phone : "",
            gst: custData?.gst,
            country: custData?.country,
            source: custData?.source,
            state: custData?.state,
            city: custData?.city,
            zip_code: custData?.zip_code,
            address: custData?.address,
            active:0,
            comp_id: comp_id ? parseInt(comp_id) : 1,
            department_id: custData?.department_id
              ? custData?.department_id
              : 1,
            post_id: custData?.post_id ? custData?.post_id : 1,
            created_by: user_id,
            created_at: getCurrentDateAndTime(),
          };

          //   console.log("users-->", users);

          db.query("INSERT INTO `users` SET ?", users, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(500)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else {
              if (group_id) {
                const users_groups = {
                  mst_user_id: result.insertId,
                  mst_group_id: group_id,
                };

                db.query(
                  "INSERT INTO `users_groups` SET ?",
                  users_groups,
                  (err, result) => {
                    if (err) {
                      console.log(err);
                    }
                  }
                );
              }

              res
                .status(201)
                .json({ error: false, message: "Customer added", data: {} });
            }
          });
        }
      });
    } catch (err) {
      res.status(500).json({
        error: true,
        message: "Unable to add the data, Something went wrong",
        data: {},
      });
    }
  },
  getCustomers: async function (req, res) {
    var comp_id = req.user.comp_id ? req.user.comp_id : 1;
    var sql =
      "SELECT `u`.`id`,`u`.`first_name`,`u`.`company_name`,`u`.`last_name`,`u`.`email`,`u`.`username`,`u`.`phone`,`u`.`profile_picture` FROM `users` as u LEFT JOIN `users_groups` as `mu` ON `mu`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`mu`.`mst_group_id` WHERE `u`.`isdeleted`=0 AND `u`.`active` = 0 AND `mg`.`name`='Client' ORDER BY u.first_name ASC; ";

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

  getCustomerById: (req, res) => {
    var user_id = parseInt(req.user.id);
    var id = parseInt(req.params.id);
    var comp_id = parseInt(req.user.comp_id);
    if (typeof id === "undefined" || !id) {
      res
        .status(201)
        .json({ error: true, message: "Id is required", data: {} });
    } else {
      var sql =
        "SELECT * FROM `users` WHERE `isdeleted`=0 and id=" +
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
    try {
      const custData = JSON.parse(JSON.stringify(req.body));
      console.log(req?.file);

      var id = custData?.id;
      var email = custData?.email;
      var password = custData?.password;

      const newFilePath = req?.file
        ? getImageWithFoldername(req?.file?.path)
        : (custData?.profile_picture || "");

      //var user_id = custData?.user_id;
      req.assert("id", "Id required.").notEmpty();
      req.assert("first_name", "First name required.").notEmpty();
      req.assert("last_name", "Last name required.").notEmpty();
      if (typeof custData?.phone != "undefined" && custData?.phone != "") {
        req.assert("phone", "Mobile should be number.").isNumeric();
        req
          .assert("phone", "Mobile length should be 10 digit.")
          .isLength({ min: 10, max: 10 });
      }
      req.assert("email", messageClass.VALIDATION.EMAIL).notEmpty();
      req.assert("email", messageClass.VALIDATION.INVALID_EMAIL).isEmail();
      //req.assert('user_id','Unauthorised').notEmpty();
      var errors = req.validationErrors();
      if (errors) {
        var data = { error: true, message: errors[0].msg, data: new Object() };
        res.status(201).send(data);
      } else {
        const user_id = req?.user?.id;
        const comp_id = req?.user?.comp_id;
        //check email exists
        var sql =
          "SELECT * FROM `users` WHERE `email`= '" +
          email +
          "' and id!='" +
          id +
          "' and `isdeleted`=0";
        db.query(sql, function (err, result) {
          if (err) {
            res
              .status(201)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else if (result.length > 0) {
            res.status(201).json({
              error: true,
              message: messageClass.RESPONSE.EMAIL_EXISTS,
              data: {},
            });
          } else {
            var sql = "SELECT *FROM `users` WHERE `id`='" + id + "'";

            db.query(sql, (err, oldData) => {
              if (err) {
                if (req?.file) {
                  unlinkSingleImage(getImageWithFoldername(req?.file?.path));
                }
                console.log(err);
                res
                  .status(200)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else if (oldData?.length > 0) {
                let oldImage = oldData[0]?.profile_picture
                  ? oldData[0]?.profile_picture
                  : "";
                let filePath = newFilePath ? newFilePath : oldImage;

                var users = {
                  first_name: custData?.first_name,
                  last_name: custData?.last_name,
                  email: email,
                  phone: custData?.phone != "" ? custData?.phone : "",
                  profile_picture: filePath,
                  active: 0,
                  comp_id: comp_id ? parseInt(comp_id) : 1,
                  updated_by: user_id,
                  updated_at: getCurrentDateAndTime(),
                };

                if (
                  typeof password !== "undefined" &&
                  password.trim().length > 0 &&
                  password != null
                ) {
                  //Change the password
                  const salt = bcrypt.genSaltSync(10);
                  const encryptedPassword = bcrypt.hashSync(password, salt);
                  users["password"] = encryptedPassword;
                }

                var sql = "UPDATE `users` SET ? WHERE `id`=" + id + "";
                //update Customer
                db.query(sql, users, function (err, result) {
                  if (err) {
                    if (req?.file) {
                      unlinkSingleImage(
                        getImageWithFoldername(req?.file?.path)
                      );
                    }
                    console.log(err);
                    res
                      .status(201)
                      .json({ error: true, message: err.sqlMessage, data: {} });
                  } else {
                    /*Unlink the following line if you wan't to delete the old image at the time of update*/
                    // if(oldImage){unlinkSingleImage(oldImage);}
                    res.status(201).json({
                      error: false,
                      message: "Changed saved",
                      data: {},
                    });
                  }
                });
              } else {
                res.status(200).json({
                  error: true,
                  message: "Unable to save the changes, Record doesn't exist",
                  data: {},
                });
              }
            });
          }
        });
      }
    } catch (err) {
      if (req?.file) {
        unlinkSingleImage(getImageWithFoldername(req?.file?.path));
      }
      res.status(201).json({
        error: true,
        message: "Unable to save the changes, Something went wrong",
        data: {},
      });
    }
  },
  updateClient: function (req, res) {
    try {
      const custData = req.body;

      var id = custData?.id;
      var email = custData?.email;
      var password = custData?.password;

      const user_id = req?.user?.id;
      const comp_id = req?.user?.comp_id;
      //check email exists
      var sql =
        "SELECT * FROM `users` WHERE `email`= '" +
        email +
        "' and id!='" +
        id +
        "' and `isdeleted`=0";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else if (result.length > 0) {
          res.status(201).json({
            error: true,
            message: messageClass.RESPONSE.EMAIL_EXISTS,
            data: {},
          });
        } else {
          var sql = "SELECT *FROM `users` WHERE `id`='" + id + "'";

          db.query(sql, (err, oldData) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ error: true, message: err.sqlMessage, data: {} });
            } else if (oldData?.length > 0) {
              var users = {
                first_name: custData?.first_name,
                company_name: custData?.company_name,
                email: email,
                phone: custData?.phone != "" ? custData?.phone : "",
                gst: custData?.gst,
                country: custData?.country,
                state: custData?.state,
                city: custData?.city,
                source: custData?.source,
                zip_code: custData?.zip_code,
                address: custData?.address,
                active: 0,
                comp_id: comp_id ? parseInt(comp_id) : 1,
                updated_by: user_id,
                updated_at: getCurrentDateAndTime(),
              };

              if (
                typeof password !== "undefined" &&
                password.trim().length > 0 &&
                password != null
              ) {
                //Change the password
                const salt = bcrypt.genSaltSync(10);
                const encryptedPassword = bcrypt.hashSync(password, salt);
                users["password"] = encryptedPassword;
              }

              var sql = "UPDATE `users` SET ? WHERE `id`=" + id + "";
              //update Customer
              db.query(sql, users, function (err, result) {
                if (err) {
                  console.log(err);
                  res
                    .status(201)
                    .json({ error: true, message: err.sqlMessage, data: {} });
                } else {
                  res.status(201).json({
                    error: false,
                    message: "Changed saved",
                    data: {},
                  });
                }
              });
            } else {
              res.status(200).json({
                error: true,
                message: "Unable to save the changes, Record doesn't exist",
                data: {},
              });
            }
          });
        }
      });
    } catch (err) {
      res.status(201).json({
        error: true,
        message: "Unable to save the changes, Something went wrong",
        data: {},
      });
    }
  },
  delete: function (req, res) {
    var id = req.body.id;
    req.assert("id", "Id required.").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      const user_id = req.user.id;
      const comp_id = req.user.comp_id;
      var sql =
        "UPDATE `users` set `isdeleted`=1,`updated_by`=" +
        parseInt(user_id) +
        ",`updated_at`='" +
        getCurrentDateAndTime() +
        "' where `id`=" +
        parseInt(id) +
        "";
      db.query(sql, function (err, result) {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          res.status(201).json({
            error: false,
            message: "Customer has been removed!",
            data: {},
          });
        }
      });
    }
  },
};
