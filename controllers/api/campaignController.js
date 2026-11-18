const { getImageWithFoldername, unlinkSingleImage } = require("../../services/FileService");
module.exports = {
  AddOrUpdateCampaign: (req, res) => {
    try {
      const user_id = req?.user?.id || null;
      const this_data = req?.body || {};
      const files = [];
      let screenshot = this_data?.screenshot || "";

      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (file.fieldname === "screenshot") {
            screenshot = getImageWithFoldername(file.path);
            files.push(screenshot);
          } else {
            if (typeof unlinkSingleImage === "function") {
              unlinkSingleImage(file.path);
            }
          }
        });
      }

      const {
        id,
        name,
        budget,
        budget_type,
        post_id,
        description,
        start_date,
        end_date,
        start_time,
        end_time,
        campaign_platform,
        target_people,
        target_location,
      } = this_data;

      const toArray = (value) => {
        if (Array.isArray(value)) return value.map(Number);
        if (typeof value === "string" && value.includes(","))
          return value.split(",").map((v) => Number(v.trim()));
        if (value || value === 0) return [Number(value)];
        return [];
      };

      const platformValue = JSON.stringify(toArray(campaign_platform));

      if (!name || !budget || !budget_type) {
        return res.status(400).json({
          error: true,
          message:
            "Required fields: name, budget, and budget_type are missing.",
          data: {},
        });
      }

      if (id) {
        const updateSql = `
          UPDATE mst_campaign
          SET 
            name = ?, 
            budget = ?, 
            budget_type = ?, 
            post_id = ?, 
            description = ?, 
            start_date = ?, 
            end_date = ?, 
            start_time = ?, 
            end_time = ?, 
            campaign_platform = ?, 
            target_people = ?, 
            target_location = ?, 
            screenshot = COALESCE(?, screenshot), 
            updated_by = ?, 
            updated_at = ?
          WHERE id = ? AND is_deleted = 0
        `;

        const updateValues = [
          name,
          budget,
          budget_type,
          post_id,
          description,
          start_date,
          end_date,
          start_time,
          end_time,
          platformValue,
          target_people,
          target_location,
          screenshot || null,
          user_id,
          getCurrentDateAndTime(),
          id,
        ];

        db.query(updateSql, updateValues, (err, result) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Campaign not found or already deleted.",
              data: {},
            });
          }

          return res.status(200).json({
            error: false,
            message: "Campaign updated successfully",
            data: { id },
          });
        });

        return;
      }

      const campaign = {
        name,
        budget,
        budget_type,
        post_id,
        description,
        start_date,
        end_date,
        start_time,
        end_time,
        campaign_platform: platformValue,
        target_people,
        target_location,
        screenshot,
        status: 0,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_by: null,
        updated_at: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_campaign SET ?", campaign, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Campaign created successfully",
          data: { id: result.insertId },
        });
      });
    } catch (error) {
      console.error("Error in AddOrUpdateCampaign:", error);
      res.status(500).json({
        error: true,
        message: "Internal server error",
        data: {},
      });
    }
  },

  fetchAdmincampaign: (req, res) => {
    try {
      var sql = `SELECT 
      mc.id, 
      IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
       IFNULL(mc.status, '') AS status,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
       DATE_FORMAT(mc.start_date, '%d-%m-%Y') AS start_date,
     DATE_FORMAT(mc.end_date, '%d-%m-%Y') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
      mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0`;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];
            try {
              campaign_platform = JSON.parse(row.campaign_platform);
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? [row.campaign_platform]
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchcampaignbyid: (req, res) => {
    const id = parseInt(req.params.id);
    try {
      var sql = `SELECT 
    mc.id, 
IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
       DATE_FORMAT(mc.start_date, '%Y-%m-%d') AS start_date,
     DATE_FORMAT(mc.end_date, '%Y-%m-%d') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
       IFNULL(mc.status, '') AS status,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
    mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0 AND mc.id=?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];

            try {
              const parsed = JSON.parse(row.campaign_platform);
              if (Array.isArray(parsed)) {
                campaign_platform = parsed.map((v) => String(v));
              } else if (typeof parsed === "string") {
                campaign_platform = parsed.split(",").map((v) => v.trim());
              }
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? row.campaign_platform.split(",").map((v) => v.trim())
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  deleteCampaign: (req, res) => {
    const id = req?.params?.id;
    const user_id = req.user.id;

    var sql =
      "UPDATE `mst_campaign` SET `is_deleted`=1,`updated_by`=" +
      parseInt(user_id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      id +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },
  fetchcampaign: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
      mc.id, 
      IFNULL(mc.name, '') AS name,
      IFNULL(mc.budget, '') AS budget,
      IFNULL(mc.budget_type, '') AS budget_type,
       IFNULL(mc.status, '') AS status,
      IFNULL(mc.post_id, '') AS post_id,
      IFNULL(mc.description, '') AS description,
      DATE_FORMAT(mc.start_date, '%Y-%m-%d') AS start_date,
      DATE_FORMAT(mc.end_date, '%Y-%m-%d') AS end_date,
      IFNULL(mc.start_time, '') AS start_time,
      IFNULL(mc.end_time, '') AS end_time,
      IFNULL(mc.campaign_platform, '') AS campaign_platform,
      IFNULL(mc.target_people, '') AS target_people,
      IFNULL(mc.target_location, '') AS target_location,
      IFNULL(mc.screenshot, '') AS screenshot
      FROM 
      mst_campaign AS mc
      WHERE 
      mc.is_deleted = 0  and mc.created_by = ?`;

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let campaign_platform = [];
            try {
              campaign_platform = JSON.parse(row.campaign_platform);
            } catch (e) {
              campaign_platform = row.campaign_platform
                ? [row.campaign_platform]
                : [];
            }

            return {
              ...row,
              campaign_platform,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },
  StatusCampaign: (req, res) => {
    const { status, id } = req.body;

    const sql = `
      UPDATE mst_campaign 
      SET status = ? 
      WHERE id = ?`;

    db.query(sql, [status, id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.status(200).json({ message: "Campaign status updated successfully" });
    });
  },

  fetchpostData: (req, res) => {
    try {
      var sql = `SELECT 
    mp.id, 
IFNULL(mp.name, '') AS name,
      IFNULL(mp.type, '') AS type,
      DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
      IFNULL(mp.platform_add, '') AS platform_add,
      IFNULL(mp.thumbnail, '') AS thumbnail,
      IFNULL(mp.caption, '') AS caption,
      IFNULL(mp.hastag, '') AS hastag,
      IFNULL(mp.status, '') AS status
FROM 
    mst_post AS mp
      WHERE 
      mp.is_deleted = 0`;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let platform_add = [];
            try {
              platform_add = JSON.parse(row.platform_add);
            } catch (e) {
              platform_add = row.platform_add ? [row.platform_add] : [];
            }

            return {
              ...row,
              platform_add,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchAdminpost: (req, res) => {
    try {
      var sql = `SELECT 
    mp.id, 
IFNULL(mp.name, '') AS name,
      IFNULL(mp.type, '') AS type,
      DATE_FORMAT(mp.date, '%d %b %Y') AS date,
      IFNULL(mp.platform_add, '') AS platform_add,
      IFNULL(mp.thumbnail, '') AS thumbnail,
      IFNULL(mp.caption, '') AS caption,
      IFNULL(mp.hastag, '') AS hastag,
      IFNULL(mp.status, '') AS status
FROM 
    mst_post AS mp
      WHERE 
      mp.is_deleted = 0`;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let platform_add = [];
            try {
              platform_add = JSON.parse(row.platform_add);
            } catch (e) {
              platform_add = row.platform_add ? [row.platform_add] : [];
            }

            return {
              ...row,
              platform_add,
            };
          });
          console.log("formattedData", formattedData);

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  addPost: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    let thumbnail = this_data?.thumbnail || "";
    let post_files = [];

    if (this_data.post_files) {
      if (Array.isArray(this_data.post_files)) {
        post_files = this_data.post_files.filter(Boolean);
      } else if (typeof this_data.post_files === "string") {
        try {
          const parsed = JSON.parse(this_data.post_files);
          if (Array.isArray(parsed)) post_files = parsed.filter(Boolean);
          else post_files = [this_data.post_files];
        } catch {
          post_files = [this_data.post_files];
        }
      }
    } else if (this_data.post_file) {
      if (Array.isArray(this_data.post_file)) {
        post_files = this_data.post_file.filter(Boolean);
      } else {
        post_files = [this_data.post_file];
      }
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "thumbnail") {
          thumbnail = getImageWithFoldername(file.path);
        } else if (file.fieldname === "post_file") {
          post_files.push(getImageWithFoldername(file.path));
        } else {
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(file.path);
          }
        }
      });
    }

    const { date, name, type, platform_add, caption, hastag } = this_data;

    const platformValue = Array.isArray(platform_add)
      ? platform_add.join(",")
      : platform_add;

    const sql = `
      INSERT INTO mst_post 
      (\`date\`, \`name\`, \`type\`, \`platform_add\`, \`caption\`, \`hastag\`, \`thumbnail\`, 
       \`status\`, \`created_by\`, \`created_at\`, \`updated_at\`, \`updated_by\`, \`is_deleted\`) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      date,
      name,
      type,
      platformValue,
      caption,
      hastag,
      thumbnail,
      0,
      user_id,
      getCurrentDateAndTime(),
      null,
      null,
      0,
    ];

    db.query(sql, values, (err, result) => {
      if (err) {
        return res.status(500).json({
          error: true,
          message: err.sqlMessage,
          data: {},
        });
      }

      const post_id = result.insertId;

      // ✅ If multiple files are uploaded, insert them in mst_type_post
      if (post_files.length > 0) {
        const insertFiles = post_files.map((file) => [post_id, file]);

        const sqlMulti = `
          INSERT INTO mst_type_post (post_id, post_file)
          VALUES ?
        `;

        db.query(sqlMulti, [insertFiles], (err3) => {
          if (err3) {
            return res.status(500).json({
              error: true,
              message: err3.sqlMessage,
              data: {},
            });
          }

          return res.status(201).json({
            error: false,
            message: "Post added successfully with multiple files.",
            data: { id: post_id },
          });
        });
      } else {
        return res.status(201).json({
          error: false,
          message: "Post added successfully (no post files uploaded).",
          data: { id: post_id },
        });
      }
    });
  },

  deletePost: function (req, res) {
    var id = req.body.id;
    req.assert("id", "Post Id required.").notEmpty();
    var errors = req.validationErrors();
    if (errors) {
      var data = { error: true, message: errors[0].msg, data: new Object() };
      res.status(201).send(data);
    } else {
      const user_id = req.user.id;

      var sql =
        "UPDATE `mst_post` SET `is_deleted`=1,`updated_by`=" +
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
            message: "Post has been Removed!",
            data: {},
          });
        }
      });
    }
  },

  fetchpostbyid: (req, res) => {
    const id = parseInt(req.params.id);
    console.log("id", id);

    const sql = `
      SELECT 
        mp.id, 
        IFNULL(mp.name, '') AS name,
        IFNULL(mp.type, '') AS type,
        DATE_FORMAT(mp.date, '%Y-%m-%d') AS date,
        IFNULL(mp.platform_add, '') AS platform_add,
        IFNULL(mp.thumbnail, '') AS thumbnail,
        IFNULL(mp.caption, '') AS caption,
        IFNULL(mp.hastag, '') AS hastag,
        IFNULL(mp.status, '') AS status,
        IFNULL(mtp.id, '') AS mtp_id,
        IFNULL(mtp.post_file, '') AS post_file
      FROM mst_post AS mp
      LEFT JOIN mst_type_post AS mtp ON mtp.post_id = mp.id
      WHERE mp.is_deleted = 0 AND mp.id = ?;
    `;

    db.query(sql, [id], (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: [] });
      }

      if (!result.length) {
        return res
          .status(404)
          .json({ error: true, message: "No record found", data: [] });
      }
      // let platform_add = [];
      // try {
      //   platform_add = JSON.parse(result[0].platform_add);
      // } catch (e) {
      //   platform_add = result[0].platform_add ? [result[0].platform_add] : [];
      // }
      let platform_add = [];

      const raw = result[0].platform_add;

      // If mobile sends array (stored as JSON text), parse it
      if (typeof raw === "string" && raw.trim().startsWith("[")) {
        try {
          const arr = JSON.parse(raw); // → [1,2]
          platform_add = [arr.join(",")]; // → ["1,2"]
        } catch (e) {
          platform_add = [raw]; // fallback
        }
      }
      // If web sends "1,2"
      else {
        platform_add = [String(raw)];
      }

      // Grouping logic
      const post = {
        id: result[0].id,
        name: result[0].name,
        type: result[0].type,
        date: result[0].date,
        platform_add,
        thumbnail: result[0].thumbnail,
        caption: result[0].caption,
        hastag: result[0].hastag,
        status: result[0].status,
        images: [],
      };

      result.forEach((row) => {
        if (row.mtp_id && row.post_file) {
          post.images.push({
            mtp_id: row.mtp_id,
            post_file: row.post_file,
          });
        }
      });

      res.status(200).json({
        error: false,
        message: "Record fetched successfully",
        data: [post],
      });
    });
  },

  StatusPost: (req, res) => {
    const { status, id } = req.body;

    const sql = `
      UPDATE mst_post 
      SET status = ? 
      WHERE id = ?`;

    db.query(sql, [status, id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.status(200).json({ message: "Post status updated successfully" });
    });
  },

  updatePost: (req, res) => {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    let thumbnail = this_data?.thumbnail;
    let post_files = [];

    if (this_data.post_files) {
      if (Array.isArray(this_data.post_files)) {
        post_files = this_data.post_files.filter(Boolean);
      } else if (typeof this_data.post_files === "string") {
        try {
          const parsed = JSON.parse(this_data.post_files);
          if (Array.isArray(parsed)) post_files = parsed.filter(Boolean);
          else post_files = [this_data.post_files];
        } catch {
          post_files = [this_data.post_files];
        }
      }
    } else if (this_data.post_file) {
      if (Array.isArray(this_data.post_file)) {
        post_files = this_data.post_file.filter(Boolean);
      } else {
        post_files = [this_data.post_file];
      }
    }

    if (req.files && req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "thumbnail") {
          thumbnail = getImageWithFoldername(f.path);
        } else if (f.fieldname === "post_file") {
          post_files.push(getImageWithFoldername(f.path));
        } else {
          if (typeof unlinkSingleImage === "function") {
            unlinkSingleImage(f.path);
          }
        }
      });
    }

    const { id, date, name, type, platform_add, caption, hastag } = this_data;

    if (!id) {
      return res.status(400).json({
        error: true,
        message: "Post ID is required for update.",
        data: {},
      });
    }

    let platformValue = "";

    if (Array.isArray(platform_add)) {
      platformValue = platform_add.join(",");
    } else if (typeof platform_add === "string") {
      platformValue = platform_add;
    } else if (typeof platform_add === "object" && platform_add !== null) {
      platformValue = Object.values(platform_add).join(",");
    }

    const getOldPost = `SELECT thumbnail FROM mst_post WHERE id = ? AND is_deleted = 0`;
    db.query(getOldPost, [id], (fetchErr, fetchRes) => {
      if (fetchErr) {
        return res.status(500).json({
          error: true,
          message: fetchErr.sqlMessage,
          data: {},
        });
      }

      if (fetchRes.length === 0) {
        return res.status(404).json({
          error: true,
          message: "Post not found.",
          data: {},
        });
      }

      if (!thumbnail) {
        thumbnail = fetchRes[0].thumbnail;
      }

      const updateSql = `
        UPDATE mst_post
        SET 
          date = ?, 
          name = ?, 
          type = ?, 
          platform_add = ?, 
          caption = ?, 
          hastag = ?, 
          thumbnail = ?, 
          updated_by = ?, 
          updated_at = ? 
        WHERE id = ? AND is_deleted = 0
      `;

      const values = [
        date,
        name,
        type,
        platformValue,
        caption,
        hastag,
        thumbnail,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, values, (updateErr, result) => {
        if (updateErr) {
          return res.status(500).json({
            error: true,
            message: updateErr.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "No post found or already deleted.",
            data: {},
          });
        }

        if (post_files.length > 0) {
          const deleteSql = `DELETE FROM mst_type_post WHERE post_id = ?`;
          db.query(deleteSql, [id], (delErr) => {
            if (delErr) {
              return res.status(500).json({
                error: true,
                message: delErr.sqlMessage,
                data: {},
              });
            }

            const fileValues = post_files.map((file) => [id, file]);
            const insertSql = `INSERT INTO mst_type_post (post_id, post_file) VALUES ?`;

            db.query(insertSql, [fileValues], (insertErr) => {
              if (insertErr) {
                return res.status(500).json({
                  error: true,
                  message: insertErr.sqlMessage,
                  data: {},
                });
              }

              return res.status(200).json({
                error: false,
                message: "Post updated successfully with new files.",
                data: { id },
              });
            });
          });
        } else {
          return res.status(200).json({
            error: false,
            message: "Post updated successfully (no file changes).",
            data: { id },
          });
        }
      });
    });
  },

  AddOrEditLeads: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;
    console.log("this_data", this_data);

    const {
      id,
      name,
      mobile_no,
      email,
      description,
      address,
      source,
      service,
      remarks, // ← add
      type, // ← add
      status,
    } = this_data;

    const serviceValue = Array.isArray(service) ? service.join(",") : service;

    console.log("serviceValue", serviceValue);

    if (id) {
      const updateSql = `
        UPDATE mst_leads
        SET
          name = ?,
          mobile_no = ?,
          email = ?,
          description = ?,
          address = ?,
          source = ?,
          service = ?,
             remarks = ?,
        type = ?,
        status = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ? AND is_deleted = 0
      `;

      const updateValues = [
        name,
        mobile_no,
        email,
        description,
        address,
        source,
        serviceValue,
          remarks || null,
      type    || null,
      status  || "active",
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Lead not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Lead updated successfully",
          data: { id },
        });
      });
    } else {
      // INSERT new lead
      const lead = {
        name,
        mobile_no,
        email,
        description,
        address,
        source,
        service: serviceValue,
        remarks:    remarks || null,    // ← add
      type:       type    || null,    // ← add
      status:     status  || "active", 
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_leads SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Lead created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchAdminleads: (req, res) => {
    try {
      var sql = `SELECT 
  ml.id, 
  IFNULL(ml.name, '') AS name,
  IFNULL(ml.mobile_no, '') AS mobile_no,
  IFNULL(ml.email, '') AS email,
  IFNULL(ml.service, '') AS service,
  IFNULL(ml.description, '') AS description,
  IFNULL(ml.address, '') AS address,
  IFNULL(ml.source, '') AS source,
    IFNULL(ml.remarks, '') AS remarks,
      IFNULL(ml.type, '') AS type,
        IFNULL(ml.status, '') AS status,

  
  -- Last follow-up fields
  IFNULL(DATE_FORMAT(lf.date, '%d-%b-%Y'), '') AS last_followup_date,
  IFNULL(lf.talk, '') AS last_followup_talk,
  IFNULL(DATE_FORMAT(lf.next_date, '%d-%b-%Y'), '') AS last_followup_next_date,
  IFNULL(u.first_name, '') AS last_followup_assigned_to

FROM mst_leads AS ml

LEFT JOIN (
  SELECT f1.*
  FROM mst_follow_ups f1
  INNER JOIN (
    SELECT lead_id, MAX(id) AS max_id
    FROM mst_follow_ups
    WHERE is_deleted = 0
    GROUP BY lead_id
  ) f2 ON f1.id = f2.max_id AND f1.lead_id = f2.lead_id
) lf ON lf.lead_id = ml.id

LEFT JOIN users AS u ON u.id = lf.assign_person

WHERE ml.is_deleted = 0
ORDER BY ml.id DESC; `;

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          // Mapping objects
          const serviceMap = {
            1: "Interior",
            2: "Architecture",
            3: "Approval Process",
          };

          const sourceMap = {
            1: "Social Media",
            2: "Website",
            3: "Email Campaign",
            4: "Google Ads",
            5: "Reference",
            6: "Event",
          };

          // Transform the data
          const transformedData = result.map((lead) => {
            // Parse service JSON string to array
            let serviceLabels = "";
            if (lead.service) {
              try {
                const serviceArray = JSON.parse(lead.service);
                serviceLabels = serviceArray
                  .map((id) => serviceMap[id])
                  .filter(Boolean)
                  .join(", ");
              } catch (e) {
                serviceLabels = lead.service;
              }
            }

            // Convert source number to label
            const sourceLabel = sourceMap[lead.source] || lead.source;

            return {
              ...lead,
              service: serviceLabels,
              source: sourceLabel,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: transformedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchleads: (req, res) => {
    const userId = req.user.id;
    try {
      var sql = `SELECT 
      ml.id, 
      IFNULL(ml.name, '') AS name,
      IFNULL(ml.mobile_no, '') AS mobile_no,
      IFNULL(ml.email, '') AS email,
      IFNULL(ml.service, '') AS service,
      IFNULL(ml.description, '') AS description,
      IFNULL(ml.address, '') AS address,
      IFNULL(ml.source, '') AS source
      FROM 
      mst_leads AS ml
      WHERE 
      ml.is_deleted = 0  and ml.created_by = ?`;

      db.query(sql, [userId], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const serviceMap = {
            1: "Interior",
            2: "Architecture",
            3: "Approval Process",
          };

          const sourceMap = {
            1: "Social Media",
            2: "Website",
            3: "Email Campaign",
            4: "Google Ads",
            5: "Reference",
            6: "Event",
          };
          // Transform the data
          const transformedData = result.map((lead) => {
            // Parse service JSON string to array
            let serviceLabels = "";
            if (lead.service) {
              try {
                const serviceArray = JSON.parse(lead.service);
                serviceLabels = serviceArray
                  .map((id) => serviceMap[id])
                  .filter(Boolean)
                  .join(", ");
              } catch (e) {
                serviceLabels = lead.service;
              }
            }

            // Convert source number to label
            const sourceLabel = sourceMap[lead.source] || lead.source;

            return {
              ...lead,
              service: serviceLabels,
              source: sourceLabel,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: transformedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },

  fetchleadsbyid: (req, res) => {
    const id = parseInt(req.params.id);
    try {
      var sql = `SELECT 
      ml.id, 
      IFNULL(ml.name, '') AS name,
      DATE_FORMAT(ml.created_at, '%Y-%m-%d') AS date,
      IFNULL(ml.mobile_no, '') AS mobile_no,
      IFNULL(ml.email, '') AS email,
      IFNULL(ml.service, '') AS service,
      IFNULL(ml.description, '') AS description,
      IFNULL(ml.address, '') AS address,
      IFNULL(ml.source, '') AS source,
          IFNULL(ml.remarks, '') AS remarks,
      IFNULL(ml.type, '') AS type,
        IFNULL(ml.status, '') AS status
      FROM 
      mst_leads AS ml
      WHERE 
      ml.is_deleted = 0  AND ml.id=?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        }

        if (result.length > 0) {
          const formattedData = result.map((row) => {
            let service = [];
            try {
              service = JSON.parse(row.service);
            } catch (e) {
              service = row.service ? [row.service] : [];
            }

            return {
              ...row,
              service,
            };
          });

          res.status(200).json({
            error: false,
            message: "Record fetched",
            data: formattedData,
          });
        } else {
          res.status(200).json({
            error: false,
            message: "Not found",
            data: [],
          });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({
        message: "Server error",
        data: {},
        error: true,
      });
    }
  },
  deleteLeads: (req, res) => {
    const id = req?.params?.id;
    const user_id = req.user.id;

    var sql =
      "UPDATE `mst_leads` SET `is_deleted`=1,`updated_by`=" +
      parseInt(user_id) +
      ",`updated_at`='" +
      getCurrentDateAndTime() +
      "' WHERE `id`=" +
      id +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdateFollowups: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, next_date, lead_id, assign_person, talk } = this_data;

    if (id) {
      const updateSql = `
        UPDATE mst_follow_ups
        SET
          next_date = ?,
          lead_id=?,
          assign_person = ?,
          talk = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ? AND is_deleted = 0
      `;

      const updateValues = [
        next_date,
        lead_id,
        assign_person,
        talk,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Follow ups not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Follow ups updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        date: getCurrentDateAndTime(),
        next_date,
        lead_id,
        assign_person,
        talk,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_follow_ups SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Follow ups  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchFollowups: (req, res) => {
    const userId = req.user.id;
    const { lead_id } = req.body;

    try {
      var sql = `SELECT 
      mfu.id, 
      mfu.lead_id,
      DATE_FORMAT(mfu.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(mfu.next_date, '%Y-%m-%d') AS next_date,
      IFNULL(u.first_name, '') AS assign_person_name,
        IFNULL(mfu.assign_person, '') AS assign_person,
      IFNULL(mfu.talk, '') AS talk
      FROM 
      mst_follow_ups AS mfu
      left join users as u
      on u.id = mfu.assign_person
      WHERE 
      mfu.is_deleted = 0  and mfu.created_by = ? and mfu.lead_id= ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchFollowupsbyid: (req, res) => {
    const id = req.params.id;

    try {
      var sql = `SELECT 
      DATE_FORMAT(mfu.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(mfu.next_date, '%Y-%m-%d') AS next_date,
      IFNULL(u.first_name, '') AS assign_person_name,
        IFNULL(mfu.assign_person, '') AS assign_person,
      IFNULL(mfu.talk, '') AS talk
      FROM 
      mst_follow_ups AS mfu
      left join users as u
      on u.id = mfu.assign_person
      WHERE 
      mfu.is_deleted = 0 and mfu.id= ?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchAdminFollowups: (req, res) => {
    const lead_id = req.params.id;
    console.log(lead_id);

    try {
      var sql = `SELECT 
      mfu.id, 
      mfu.lead_id,
      DATE_FORMAT(mfu.date, '%Y-%m-%d') AS date,
      DATE_FORMAT(mfu.next_date, '%Y-%m-%d') AS next_date,
      IFNULL(u.first_name, '') AS assign_person_name,
        IFNULL(mfu.assign_person, '') AS assign_person,
      IFNULL(mfu.talk, '') AS talk
      FROM 
      mst_follow_ups AS mfu
      left join users as u
      on u.id = mfu.assign_person
      WHERE 
      mfu.is_deleted = 0  and mfu.lead_id= ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteFollowups: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_follow_ups` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdateQuestion: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, heading, lead_id, answer } = this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_question
      SET
        heading = ?,
        lead_id=?,
        answer = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        heading,
        lead_id,
        answer,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Question not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Question updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        heading,
        lead_id,
        answer,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_question SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Question  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchQuestionbyid: (req, res) => {
    const id = parseInt(req.params.id);
    console.log("lead_id", id);
    try {
      var sql = `SELECT 
    IFNULL(mq.heading, '') AS heading,
    IFNULL(mq.answer, '') AS answer
    FROM 
    mst_question AS mq
    WHERE 
    mq.is_deleted = 0  and mq.id= ?`;

      db.query(sql, [id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchAdminQuestion: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mq.id, 
    mq.lead_id,
    IFNULL(mq.heading, '') AS heading,
    IFNULL(mq.answer, '') AS answer
    FROM 
    mst_question AS mq
    WHERE 
    mq.is_deleted = 0  and mq.lead_id= ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  fetchQuestion: (req, res) => {
    const userId = req.user.id;
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mq.id, 
    mq.lead_id,
    IFNULL(mq.heading, '') AS heading,
    IFNULL(mq.answer, '') AS answer
    FROM 
    mst_question AS mq
    WHERE 
    mq.is_deleted = 0  and mq.created_by = ? and mq.lead_id= ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteQuestion: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_question` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdateMeetingschedule: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;

    const { id, date, lead_id, heading, discussion, assign_person } = this_data;

    if (id) {
      const updateSql = `
      UPDATE mst_leads_meeting
      SET
      date = ?,
      lead_id=?,
        heading = ?,
        discussion = ?,
        assign_person=?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

      const updateValues = [
        date,
        lead_id,
        heading,
        discussion,
        assign_person,
        user_id,
        getCurrentDateAndTime(),
        id,
      ];

      db.query(updateSql, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: true,
            message: "Meeting not found or already deleted.",
            data: {},
          });
        }

        return res.status(200).json({
          error: false,
          message: "Meeting updated successfully",
          data: { id },
        });
      });
    } else {
      const lead = {
        date,
        lead_id,
        heading,
        discussion,
        assign_person,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_leads_meeting SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Meeting  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchMeetingSchedulebyid: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mlm.id, 
     DATE_FORMAT(mlm.date, '%Y-%m-%d') AS date,
    IFNULL(mlm.heading, '') AS heading,
    IFNULL(mlm.discussion, '') AS discussion,
     IFNULL(mlm.assign_person, '') AS assign_person,
      IFNULL(u.first_name, '') AS assign_person_name
    FROM 
    mst_leads_meeting AS mlm
    left join users as u
      on u.id = mlm.assign_person
    WHERE 
    mlm.is_deleted = 0   and mlm.id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchAdminMeetingSchedule: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mlm.id, 
     DATE_FORMAT(mlm.date, '%Y-%m-%d') AS date,
    IFNULL(mlm.heading, '') AS heading,
    IFNULL(mlm.discussion, '') AS discussion,
     IFNULL(mlm.assign_person, '') AS assign_person,
      IFNULL(u.first_name, '') AS assign_person_name
    FROM 
    mst_leads_meeting AS mlm
    left join users as u
      on u.id = mlm.assign_person
    WHERE 
    mlm.is_deleted = 0   and mlm.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchMeetingSchedule: (req, res) => {
    const userId = req.user.id;
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mlm.id, 
     DATE_FORMAT(mlm.date, '%Y-%m-%d') AS date,
    IFNULL(mlm.heading, '') AS heading,
    IFNULL(mlm.discussion, '') AS discussion,
     IFNULL(mlm.assign_person, '') AS assign_person,
      IFNULL(u.first_name, '') AS assign_person_name
    FROM 
    mst_leads_meeting AS mlm
    left join users as u
      on u.id = mlm.assign_person
    WHERE 
    mlm.is_deleted = 0  and mlm.created_by = ? and mlm.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteMeetingSchedule: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_leads_meeting` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdateSitevisit: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;
    const files = [];
    let image = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "image") {
          image = getImageWithFoldername(file.path);
          files.push(image);
        } else {
          unlinkImage(file.path);
        }
      });
    }

    const { id, date, lead_id, visitor, site_visit_for, observation } =
      this_data;

    if (id) {
      const getOld = `SELECT image FROM mst_site_visit WHERE id = ? AND is_deleted = 0`;

      db.query(getOld, [id], (err, oldData) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
          });
        }

        if (oldData.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Site Visit not found.",
          });
        }

        // 2️⃣ If no new image uploaded → keep old image
        const finalImage = image || oldData[0].image;

        const updateSql = `
      UPDATE mst_site_visit
      SET
      date = ?,
      lead_id=?,
       image = ?,
        visitor = ?,
        site_visit_for = ?,
        observation = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

        const updateValues = [
          date,
          lead_id,
          finalImage,
          visitor,
          site_visit_for,
          observation,
          user_id,
          getCurrentDateAndTime(),
          id,
        ];

        db.query(updateSql, updateValues, (err, result) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Site Visit not found or already deleted.",
              data: {},
            });
          }

          return res.status(200).json({
            error: false,
            message: "Site Visit updated successfully",
            data: { id },
          });
        });
      });
    } else {
      const lead = {
        date,
        lead_id,
        image,
        visitor,
        site_visit_for,
        observation,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_site_visit SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Site Visit  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchSitevisitbyid: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    msv.id, 
     DATE_FORMAT(msv.date, '%Y-%m-%d') AS date,
    IFNULL(msv.image, '') AS image,
    IFNULL(msv.visitor, '') AS visitor,
        IFNULL(u.first_name, '') AS visitor_name,
      IFNULL(msv.site_visit_for, '') AS site_visit_for,
        IFNULL(msv.observation, '') AS observation
    FROM 
    mst_site_visit AS msv
    left join users as u
      on u.id = msv.visitor
    WHERE 
    msv.is_deleted = 0   and msv.id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  fetchAdminSitevisit: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    msv.id, 
     DATE_FORMAT(msv.date, '%Y-%m-%d') AS date,
    IFNULL(msv.image, '') AS image,
    IFNULL(msv.visitor, '') AS visitor,
        IFNULL(u.first_name, '') AS visitor_name,
      IFNULL(msv.site_visit_for, '') AS site_visit_for,
        IFNULL(msv.observation, '') AS observation
    FROM 
    mst_site_visit AS msv
    left join users as u
      on u.id = msv.visitor
    WHERE 
    msv.is_deleted = 0   and msv.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  fetchSitevisit: (req, res) => {
    const userId = req.user.id;
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    msv.id, 
     DATE_FORMAT(msv.date, '%Y-%m-%d') AS date,
    IFNULL(msv.image, '') AS image,
    IFNULL(msv.visitor, '') AS visitor,
        IFNULL(u.first_name, '') AS visitor_name,
      IFNULL(msv.site_visit_for, '') AS site_visit_for,
        IFNULL(msv.observation, '') AS observation
    FROM 
    mst_site_visit AS msv
    left join users as u
      on u.id = msv.visitor
    WHERE 
    msv.is_deleted = 0  and msv.created_by = ? and msv.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteSitevisit: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_site_visit` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdateproposal: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;
    const files = [];
    let proposal = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "proposal") {
          proposal = getImageWithFoldername(file.path);
          files.push(proposal);
        } else {
          unlinkImage(file.path);
        }
      });
    }

    const { id, lead_id, scope_of_work, status } = this_data;

    if (id) {
      const getOld = `SELECT proposal FROM mst_proposal WHERE id = ? AND is_deleted = 0`;

      db.query(getOld, [id], (err, oldData) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
          });
        }

        if (oldData.length === 0) {
          return res.status(404).json({
            error: true,
            message: "Proposal not found.",
          });
        }

        // 2️⃣ If no new image uploaded → keep old image
        const finalImage = proposal || oldData[0].proposal;

        const updateSql = `
      UPDATE mst_proposal
      SET
      proposal = ?,
      lead_id=?,
       scope_of_work = ?,
        status = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

        const updateValues = [
          finalImage,
          lead_id,
          scope_of_work,
          status,
          user_id,
          getCurrentDateAndTime(),
          id,
        ];

        db.query(updateSql, updateValues, (err, result) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "Proposal not found or already deleted.",
              data: {},
            });
          }

          return res.status(200).json({
            error: false,
            message: "Proposal updated successfully",
            data: { id },
          });
        });
      });
    } else {
      const lead = {
        proposal,
        lead_id,
        scope_of_work,
        status,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO mst_proposal SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "Proposal  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchproposalbyid: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mp.id, 
    IFNULL(mp.proposal, '') AS proposal,
    IFNULL(mp.scope_of_work, '') AS scope_of_work,
      IFNULL(mp.status, '') AS status
    FROM 
    mst_proposal AS mp
    WHERE 
    mp.is_deleted = 0   and mp.id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchAdminproposal: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mp.id, 
    IFNULL(mp.proposal, '') AS proposal,
    IFNULL(mp.scope_of_work, '') AS scope_of_work,
      IFNULL(mp.status, '') AS status
    FROM 
    mst_proposal AS mp
    WHERE 
    mp.is_deleted = 0   and mp.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  fetchproposal: (req, res) => {
    const userId = req.user.id;
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    mp.id, 
    IFNULL(mp.proposal, '') AS proposal,
    IFNULL(mp.scope_of_work, '') AS scope_of_work,
      IFNULL(mp.status, '') AS status
    FROM 
    mst_proposal AS mp
    WHERE 
    mp.is_deleted = 0  and mp.created_by = ? and mp.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deleteProposal: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `mst_proposal` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  AddOrUpdatepresentation: (req, res) => {
    const user_id = req?.user ? req?.user?.id : null;
    const this_data = req?.body;
    const files = [];
    let presentation = "";

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "presentation") {
          presentation = getImageWithFoldername(file.path);
          files.push(presentation);
        } else {
          unlinkImage(file.path);
        }
      });
    }

    const { id, lead_id, presented_by, summary, feedback, date } = this_data;

    if (id) {
      const getOld = `SELECT presentation FROM presentation WHERE id = ? AND is_deleted = 0`;

      db.query(getOld, [id], (err, oldData) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
          });
        }

        if (oldData.length === 0) {
          return res.status(404).json({
            error: true,
            message: "presentation not found.",
          });
        }

        // 2️⃣ If no new image uploaded → keep old image
        const finalImage = presentation || oldData[0].presentation;

        const updateSql = `
      UPDATE presentation
      SET
      presentation = ?,
      lead_id=?,
       presented_by = ?,
        summary = ?,
          feedback = ?,
            date = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND is_deleted = 0
    `;

        const updateValues = [
          finalImage,
          lead_id,
          presented_by,
          summary,
          feedback,
          date,
          user_id,
          getCurrentDateAndTime(),
          id,
        ];

        db.query(updateSql, updateValues, (err, result) => {
          if (err) {
            return res.status(500).json({
              error: true,
              message: err.sqlMessage,
              data: {},
            });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({
              error: true,
              message: "presentation not found or already deleted.",
              data: {},
            });
          }

          return res.status(200).json({
            error: false,
            message: "presentation updated successfully",
            data: { id },
          });
        });
      });
    } else {
      const lead = {
        presentation,
        lead_id,
        presented_by,
        summary,
        feedback,
        date,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };

      db.query("INSERT INTO presentation SET ?", lead, (err, result) => {
        if (err) {
          return res.status(500).json({
            error: true,
            message: err.sqlMessage,
            data: {},
          });
        }

        return res.status(201).json({
          error: false,
          message: "presentation  created successfully",
          data: { id: result.insertId },
        });
      });
    }
  },

  fetchpresentationbyid: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    p.id, 
    IFNULL(p.presentation, '') AS presentation,
    IFNULL(p.presented_by, '') AS presented_by,
       IFNULL(u.first_name, '') AS presented_name,
     DATE_FORMAT(p.date, '%Y-%m-%d') AS date,
      IFNULL(p.summary, '') AS summary,
      IFNULL(p.feedback, '') AS feedback
    FROM 
    presentation AS p
    left join users as u
      on u.id = p.presented_by
    WHERE 
    p.is_deleted = 0  and p.id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  fetchpAdminresentation: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    p.id, 
    IFNULL(p.presentation, '') AS presentation,
    IFNULL(p.presented_by, '') AS presented_by,
       IFNULL(u.first_name, '') AS presented_name,
     DATE_FORMAT(p.date, '%Y-%m-%d') AS date,
      IFNULL(p.summary, '') AS summary,
      IFNULL(p.feedback, '') AS feedback
    FROM 
    presentation AS p
    left join users as u
      on u.id = p.presented_by
    WHERE 
    p.is_deleted = 0   and p.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
  fetchpresentation: (req, res) => {
    const userId = req.user.id;
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    p.id, 
    IFNULL(p.presentation, '') AS presentation,
    IFNULL(p.presented_by, '') AS presented_by,
       IFNULL(u.first_name, '') AS presented_name,
     DATE_FORMAT(p.date, '%Y-%m-%d') AS date,
      IFNULL(p.summary, '') AS summary,
      IFNULL(p.feedback, '') AS feedback
    FROM 
    presentation AS p
    left join users as u
      on u.id = p.presented_by
    WHERE 
    p.is_deleted = 0  and p.created_by = ? and p.lead_id = ?`;

      db.query(sql, [userId, lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },

  deletepresentation: (req, res) => {
    const id = req?.params?.id;

    const data = {
      is_deleted: 1,
    };

    var sql = "UPDATE `presentation` SET ? WHERE `id`=" + id + "";

    db.query(sql, data, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err?.sqlMessage, error: true, data: [] });
      } else {
        res.status(200).json({ message: "Removed", error: false, data: [] });
      }
    });
  },

  fetchterms: (req, res) => {
    const lead_id = req.params.id;
    try {
      var sql = `SELECT 
    tnc.id, 
    IFNULL(tnc.terms, '') AS terms,
       DATE_FORMAT(tnc.date, '%Y-%m-%d') AS date,
      IFNULL(tnc.status, '') AS status
    FROM 
    terms_n_condition AS tnc
    WHERE 
    tnc.is_deleted = 0 and tnc.lead_id = ?`;

      db.query(sql, [lead_id], (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ error: true, message: err.sqlMessage, data: [] });
        } else if (result.length > 0) {
          res
            .status(200)
            .json({ error: false, message: "Record fetched", data: result });
        } else {
          res
            .status(200)
            .json({ error: false, message: "Not found", data: [] });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: true });
    }
  },
};
