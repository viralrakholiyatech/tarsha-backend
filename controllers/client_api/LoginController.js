module.exports = {
  client_login: (req, res) => {
    try {
      const email = req.body?.email;
      const password = req.body?.password;

      req.assert("email", "Email or username required.").notEmpty();
      req.assert("password", "Password is required").notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        res.status(200).json({ message: errors[0].msg, error: true, data: {} });
      } else {
        var sql =
          "SELECT `mst_group_id`as role_id,`mst_groups`.`name` as `role`,`users`.`comp_id`,`users`.`id`,`users`.`password`,`users`.`active`,`users`.`first_name`,`users`.`last_name`,concat(`users`.`first_name`,' ',`users`.`last_name`) as `fullname`,`email`,`username`,`phone`,`users`.`country_id`,`countries`.`name` as `country_name`,`users`.`state_id`,`states`.`name` as `state_name`,`users`.`city_id`,`cities`.`name` as `city_name`,`street`,`address`,`users`.`description`,`zip_code`,`users`.`created_at`,`users`.`updated_at`,`users`.`profile_picture`,`users`.`isdeleted` FROM `users` LEFT JOIN `users_groups` ON `users_groups`.`mst_user_id`=`users`.`id` LEFT JOIN `mst_groups` ON `mst_groups`.`id`=`users_groups`.`mst_group_id` LEFT JOIN `countries` ON `countries`.`country_id` = `users`.`country_id` LEFT JOIN `states` ON `states`.`state_id` = `users`.`state_id` LEFT JOIN `cities` ON `cities`.`city_id` = `users`.`city_id` WHERE `users`.`email`='" +
          email +
          "' and `users`.`isdeleted`=0 and `mst_groups`.`name`='Client'";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ message: err.sqlMessage, error: true, data: {} });
          } else if (result.length > 0) {
            const isPasswordCorrect = bcrypt.compareSync(
              password,
              result[0]?.password
            );
            if (isPasswordCorrect) {
              if (parseInt(result[0]?.active) === 1) {
                const tokenData = {
                  id: result[0]?.id,
                  name: result[0]?.name,
                  role: result[0].role,
                  comp_id: result[0]?.comp_id,
                  user_roles: result.map((r) => r?.role),
                };

                const token = jwt.sign(tokenData, meta.thekey, {
                  expiresIn: "365d",
                });

                const data = {
                  user_id: tokenData.id,
                  role_id: result[0]?.role_id ? result[0].role_id : "",
                  user_roles:
                    tokenData.user_roles?.length > 0
                      ? tokenData.user_roles
                      : "",
                  image_path:
                    "https://webapp.zaidexceldesign.com/public/users/",
                  phone: result[0]?.phone ? result[0].phone : "",
                  first_name: result[0]?.first_name
                    ? result[0]?.first_name
                    : "",
                  last_name: result[0]?.last_name ? result[0]?.last_name : "",
                  fullname: result[0]?.fullname ? result[0]?.fullname : "",
                  email: result[0]?.email ? result[0]?.email : "",
                  username: result[0]?.username ? result[0]?.username : "",
                  profile_picture: result[0]?.profile_picture
                    ? result[0]?.profile_picture
                    : "",
                  token: token,
                };

                res
                  .status(200)
                  .json({ message: "Logged In", error: false, data: data });
              } else {
                res.status(200).json({
                  message: "Account is disabled",
                  error: true,
                  data: {},
                });
              }
            } else {
              res
                .status(200)
                .json({ message: "Invalid password", error: true, data: {} });
            }
          } else {
            res
              .status(200)
              .json({ message: "email doesn't exist", error: true, data: {} });
          }
        });
      }
    } catch (err) {
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
};
