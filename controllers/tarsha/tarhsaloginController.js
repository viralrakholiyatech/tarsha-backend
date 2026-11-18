module.exports = {
  login: (req, res) => {
    try {
      const { email, password, device_token } = req.body;
      console.log("req.body==>",req.body)

      // Validation
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: true, message: "Email and password are required." });
      }

      // Database query to fetch user data
      const sql = `
        SELECT 
          u.id,
          u.comp_id,
          u.password,
          u.active,
          u.first_name,
          u.last_name,
          CONCAT(u.first_name, ' ', u.last_name) AS fullname,
          u.email,
          u.username,
          u.profile_picture,
          ug.mst_group_id AS role_id,
          mg.name AS role,
          u.device_token
        FROM 
          users AS u
        LEFT JOIN 
          users_groups AS ug ON u.id = ug.mst_user_id
        LEFT JOIN 
          mst_groups AS mg ON ug.mst_group_id = mg.id
        WHERE 
          u.email = ? AND
          u.isdeleted = 0 AND
          mg.name IN ('admin', 'Employees', 'subadmin', 'cordinator', 'Hod','SuperAdmin')
        LIMIT 1`;

      db.query(sql, [email], (err, result) => {
        if (err) {
          console.error("Error querying database:", err);
          return res.status(500).json({ error: true, message: "Server error" });
        }

        if (result.length === 0) {
          return res
            .status(404)
            .json({ error: true, message: "User not found" });
        }

        const user = result[0];

        if (!bcrypt.compareSync(password, user.password)) {
          return res
            .status(401)
            .json({ error: true, message: "Invalid username/password" });
        }

        if (user.active !== 1) {
          return res
            .status(403)
            .json({ error: true, message: "Account is inactive" });
        }
          // Check if the user has admin role
          if (user.role !== 'SuperAdmin') {
            return res.status(403).json({ error: true, message: "You are not authorized to login as admin" });
        }

        const token = jwt.sign(
          {
            id: user.id,
            user_roles: [user.role],
            role: user.role,
            comp_id: user.comp_id,
          },
          "gojo-satoru",
          { expiresIn: "365d" }
        );

        // Update the device_token for the logged-in user
        const updateTokenSql = "UPDATE users SET device_token = ? WHERE id = ?";
        db.query(
          updateTokenSql,
          [device_token, user.id],
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error("Error updating device token:", updateErr);
              // Handle the error if the device_token update fails
            }
          }
        );

        const responseData = {
          id: user.id,
          image_path: "https://webapp.zaidexceldesign.com/",
          role_id: user.role_id,
          role: user.role,
          user_roles: [user.role],
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          fullname: user.fullname,
          email: user.email,
          username: user.username,
          profile_picture: user.profile_picture,
          token: token,
          device_token: device_token,
        };

        res
          .status(200)
          .json({ error: false, message: "Login success", data: responseData });
      });
    } catch (err) {
      console.error("Server error:", err);
      res.status(500).json({ error: true, message: "Server error" });
    }
  },

  getdashboard: async function (req, res) {
    // Query to get total users, users with plan status 2, and users with plan status 3
    var sql =
      "SELECT COUNT(*) AS total_users, COUNT(CASE WHEN plan_status = 2 THEN 1 END) AS users_with_plan_status_2, COUNT(CASE WHEN plan_status = 3 THEN 1 END) AS users_with_plan_status_3   FROM users    WHERE isdeleted = 0";
    // Query to get total active support tickets
    var support =
      "SELECT COUNT(id) AS Total_support FROM support WHERE status = 'Active' AND is_deleted = 0";
    // Query to get total users
    var users ="SELECT COUNT(id) AS Total_user FROM users WHERE isdeleted = 0";
    
    // Execute the SQL queries
    db.query(sql, function (err, usersResult) {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(500).send(data); // Send error response
      } else {
        db.query(support, function (err, supportResult) {
          if (err) {
            var data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).send(data); // Send error response
          } else {
            db.query(users, function (err, totalUsersResult) {
              if (err) {
                var data = { error: true, message: err.sqlMessage, data: {} };
                res.status(500).send(data); // Send error response
              } else {
                var data = {
                  error: false,
                  message: "Records fetched successfully",
                  users: usersResult[0],
                  support: supportResult[0],
                  totalUsers: totalUsersResult[0]
                };
                res.status(200).send(data); // Send success response with fetched data
              }
            });
          }
        });
      }
    });
}

};
