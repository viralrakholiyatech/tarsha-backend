
module.exports = {
  getProjects: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage`,(SELECT COUNT(*) FROM `site_inspection` WHERE `mst_file_project_id` = `mf`.`id`) AS `project_count` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf2`.`status_file_name`)=LCASE('Project')";

      db.query(sql, (err, result) => {
        if (err) {
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
  getProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;

      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`team_id`=" +
        team_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
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
  getOnlineProjectForSuperUser: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`='Online') and LCASE(`sf2`.`status_file_name`)=LCASE('Project')";
      db.query(sql, (err, result) => {
        if (err) {
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
  getOfflineProjectForSuperUser: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Offline') and LCASE(`sf2`.`status_file_name`)=LCASE('Project')";
      db.query(sql, (err, result) => {
        if (err) {
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
  getBucProjectForSuperUser: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`buc` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Yes') and LCASE(`sf2`.`status_file_name`)=LCASE('Project')";
      db.query(sql, (err, result) => {
        if (err) {
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
  getApprovedProjectForSuperUser: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Approved') AND LCASE(`sf2`.`status_file_name`)=LCASE('Project')";
      db.query(sql, (err, result) => {
        if (err) {
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
  getRejectProjectForSuperUser: (req, res) => {
    try {
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`='Reject') and LCASE(`sf2`.`status_file_name`='Project')";
      db.query(sql, (err, result) => {
        if (err) {
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

  getOnlineProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;

      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code`as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`='Online') and LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`team_id`=" +
        team_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
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
  getOfflineProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;

      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`process` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Offline') and LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`team_id`=" +
        team_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
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
  getBucProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`buc` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Yes') and LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`team_id`=" +
        team_id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
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

  getApprovedProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;
      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`)=LCASE('Approved') AND LCASE(`sf2`.`status_file_name`)=LCASE('Project') and `mf`.`team_id`=" +
        team_id +
        "";
      db.query(sql, (err, result) => {
        if (err) {
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

  getRejectProjectForTeam: (req, res) => {
    try {
      const team_id = req?.user?.id;

      var sql =
        "SELECT `mf`.*,`mfc`.`title` as `code_title`,CONCAT(`u`.`first_name`,' ',`u`.`last_name`) as `cust_name`,CONCAT(`u2`.`first_name`,' ',`u2`.`last_name`) as `team`,`mf`.`team_id`,`ms`.`title` as `stage_title`,`fd`.`tps_stage` from `mst_file`as `mf` LEFT JOIN `users` as `u` ON `u`.`id`=`mf`.`cus_id` LEFT JOIN `users` as `u2` ON `u2`.`id`=`mf`.`team_id` LEFT JOIN `mst_stage` as `ms` ON `ms`.`id`=`mf`.`mst_stage_id` LEFT JOIN `users_groups` as `ug` ON `ug`.`mst_user_id`=`u`.`id` LEFT JOIN `mst_groups` as `mg` ON `mg`.`id`=`ug`.`mst_group_id` LEFT JOIN `file_details` as `fd` on `fd`.`mst_file_id`=`mf`.`id` LEFT JOIN `status_file` as `sf` ON `sf`.`id`=`mf`.`status` LEFT JOIN `status_file` as `sf2` ON `sf2`.`id`=`mf`.`category` LEFT JOIN `mst_file_code` as `mfc` ON `mfc`.`id`=`mf`.`code` WHERE `mf`.`isdeleted`=0 and LCASE(`sf`.`status_file_name`='Reject') and LCASE(`sf2`.`status_file_name`='Project') and `mf`.`team_id`=" +
        team_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
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

  // insert project
  addProject: function (req, res) {
    const requiredFields = ["project_name", "address", "mst_project_type_id"];

    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      const errorMessage =
        "Missing required fields: " + missingFields.join(", ");
      console.error(errorMessage);
      return res
        .status(400)
        .json({ error: true, message: errorMessage, data: {} });
    }

    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    console.log("Uploaded files:", req.files);

    const files = [];

    let google_image = "";

    req.files.forEach((file) => {
      if (file.fieldname === "google_image") {
        console.log("file.fieldname", file.fieldname);
        google_image = getImageWithFoldername(file.path);
        files.push(google_image);
        console.log("  files.push==>", google_image);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });
    console.log("google_image--->", google_image);

    if (!google_image) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the google image.",
        data: {},
      });
    }

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    console.log("this_data==>", this_data);

    const project = {
      mst_file_id: this_data.mst_file_id,
      project_name: this_data.project_name,
      project_date: this_data.project_date,
      address: this_data.address,
      mst_project_type_id: this_data.mst_project_type_id,
      google_location: this_data.google_location,
      google_image: "projectsummery/" + google_image,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project==>", project);
    // if(id){

    // }else{
    db.query(
      "INSERT INTO project_detail_new SET ?",
      project,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Details has been added successfully.",
          data: {
            id: result.insertId,
            // Include any other relevant data you want to send
          },
        };
        res.status(201).json(data);
      }
    );
    // }
  },

  getProjectTypes: async function (req, res) {
    //get current user
    var sql = "select * from mst_project_type where is_deleted = 0 order by title asc";

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

  getProjectbyid: (req, res) => {
    try {
      const mst_file_id = req.params?.mst_file_id;

      if (parseInt(mst_file_id) != NaN) {
        var sql =
          "select * from project_detail_new   where is_deleted = 0   and mst_file_id=" +
          mst_file_id +
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

  updateProject: function (req, res) {
    const requiredFields = ["project_name", "address", "mst_project_type_id"];

    const errors = req.validationErrors();

    if (errors) {
      const errorMessage = errors[0].msg;
      console.error(errorMessage);
      return res
        .status(400)
        .json({ error: true, message: errorMessage, data: {} });
    }

    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var oldFiles = [];
    var newFiles = [];
    var google_image = "";
    //console.log("google_image789--->", req);
    if (req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "google_image") {
          console.log("google_image789--->", f.fieldname);
          google_image = getImageWithFoldername(f.path);
          newFiles.push(google_image);
        } else {
          /*Remove others name images*/
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    }
    console.log("google_image1234--->", google_image);
    console.log("Uploaded Files:", req.files);

    var sql =
      "SELECT * from `project_detail_new` WHERE `mst_file_id`=" +
      parseInt(this_data.mst_file_id) +
      "";
    console.log("mst_file_id==>", this_data.mst_file_id);

    db.query(sql, (err, result) => {
      if (err) {
        unlinkMultipleImages(newFiles);
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log("result==>", result);

        google_image
          ? oldFiles.push(result[0].google_image)
          : (google_image = result[0].google_image);

        const user_id = req?.user?.id;
        const mst_file_id = this_data?.mst_file_id;

        const google_image_url = google_image;
        console.log("google_image_url==>", google_image_url);

        const project = {
          mst_file_id: this_data.mst_file_id,
          project_name: this_data.project_name,
          project_date: this_data.project_date,
          address: this_data.address,
          mst_project_type_id: this_data.mst_project_type_id,
          google_location: this_data.google_location,
          google_image: "projectsummery/" + google_image_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.mst_file_id); // Just before the db.query call

        console.log(project);
        const updateSql =
          "UPDATE `project_detail_new` SET " +
          "`project_name`='" +
          project.project_name +
          "'," +
          "`project_date`='" +
          project.project_date +
          "'," +
          "`address`='" +
          project.address +
          "'," +
          "`google_image`='" +
          project.google_image +
          "'," +
          "`mst_project_type_id`='" +
          project.mst_project_type_id +
          "'," +
          "`google_location`='" +
          project.google_location +
          "'," +
          "`updated_at`='" +
          project.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project.updated_by) +
          " WHERE `mst_file_id`=" +
          mst_file_id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },
  addLocation: function (req, res) {
    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    console.log("Uploaded files:", req.files);

    const files = [];

    let east_wide = "";
    let west_wide = "";
    let south_wide = "";
    let north_wide = "";

    req.files.forEach((file) => {
      if (file.fieldname === "east_wide") {
        east_wide = getImageWithFoldername(file.path);
        files.push(east_wide);
      } else if (file.fieldname === "west_wide") {
        west_wide = getImageWithFoldername(file.path);
        files.push(west_wide);
      } else if (file.fieldname === "south_wide") {
        south_wide = getImageWithFoldername(file.path);
        files.push(south_wide);
      } else if (file.fieldname === "north_wide") {
        north_wide = getImageWithFoldername(file.path);
        files.push(north_wide);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });
    console.log("file_upload--->", east_wide);
    console.log("file_upload--->", west_wide);
    console.log("file_upload--->", south_wide);
    console.log("file_upload--->", north_wide);

    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    console.log("swhdbc==>", this_data);

    const project1 = {
      project_detail_id: this_data.project_detail_id,
      direction: this_data.direction,
      description: this_data.east,
      created_by: user_id,
      file_upload: "projectlocation/" + east_wide,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project1==>", project1);
    db.query(
      "INSERT INTO project_site_location SET ?",
      project1,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          console.error("Database Insertion Error:", err);

          return res

            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Location has been added successfully.",
          data: {
            id: result.insertId,
            // data: project,
            // Include any other relevant data you want to send
          },
        };
        // console.log("Response Data:", data);
        //res.status(201).json(data);
      }
    );

    const project2 = {
      project_detail_id: this_data.project_detail_id,
      direction: this_data.west_direction,
      description: this_data.west,
      created_by: user_id,
      file_upload: "projectlocation/" + west_wide,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project12==>", project2);
    db.query(
      "INSERT INTO project_site_location SET ?",
      project2,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          console.error("Database Insertion Error:", err);

          return res

            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Location has been added successfully.",
          data: {
            id: result.insertId,
            // data: project,
            // Include any other relevant data you want to send
          },
        };
        // console.log("Response Data:", data);
        // res.status(201).json(data);
      }
    );

    const project3 = {
      project_detail_id: this_data.project_detail_id,
      direction: this_data.north_direction,
      description: this_data.north,
      created_by: user_id,
      file_upload: "projectlocation/" + north_wide,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project3==>", project3);
    db.query(
      "INSERT INTO project_site_location SET ?",
      project3,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          console.error("Database Insertion Error:", err);

          return res

            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Location has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
      }
    );

    const project4 = {
      project_detail_id: this_data.project_detail_id,
      direction: this_data.south_direction,
      description: this_data.south,
      file_upload: "projectlocation/" + south_wide,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project4==>", project4);
    db.query(
      "INSERT INTO project_site_location SET ?",
      project4,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          console.error("Database Insertion Error:", err);

          return res

            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Location has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
      }
    );
    res.status(201).json("hi");
  },

  getLocationbyid: (req, res) => {
    try {
      const project_detail_id = req.params?.project_detail_id;

      if (parseInt(project_detail_id) != NaN) {
        var sql =
          "select * from project_site_location  where is_deleted = 0   and project_detail_id=" +
          project_detail_id +
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
  updateLocation: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    if (!this_data.project_detail_id) {
      const errorResponse = {
        error: true,
        message: "project_detail_id is missing in the request body",
        data: {},
      };
      return res.status(400).json(errorResponse);
    }
    var oldFiles = [];
    var newFiles = [];
    var east_wide = "";
    var west_wide = "";
    var south_wide = "";
    var north_wide = "";

    if (req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "east_wide") {
          east_wide = getImageWithFoldername(f.path);
          newFiles.push(east_wide);
        } else if (f.fieldname === "west_wide") {
          west_wide = getImageWithFoldername(f.path);
          newFiles.push(west_wide);
        } else if (f.fieldname === "south_wide") {
          south_wide = getImageWithFoldername(f.path);
          newFiles.push(south_wide);
        } else if (f.fieldname === "north_wide") {
          north_wide = getImageWithFoldername(f.path);
          newFiles.push(north_wide);
        } else {
          /*Remove others name images*/
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    }
    console.log("file_upload--->", east_wide);
    console.log("file_upload--->", west_wide);
    console.log("file_upload--->", south_wide);
    console.log("file_upload--->", north_wide);

    var sql =
      "SELECT * from `project_site_location` WHERE `project_detail_id`=" +
      parseInt(this_data.project_detail_id) +
      "";
    console.log("project_detail_id==>", this_data.project_detail_id);

    db.query(sql, (err, result) => {
      if (err) {
        unlinkMultipleImages(newFiles);
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        east_wide
          ? oldFiles.push(result[0].east_wide)
          : (east_wide = result[0].east_wide);
        west_wide
          ? oldFiles.push(result[1].west_wide)
          : (west_wide = result[1].west_wide);
        south_wide
          ? oldFiles.push(result[2].south_wide)
          : (south_wide = result[2].south_wide);
        north_wide
          ? oldFiles.push(result[3].north_wide)
          : (north_wide = result[3].north_wide);

        const user_id = req?.user?.id;
        const project_detail_id = this_data?.project_detail_id;

        const east_upload_url = east_wide;
        const west_upload_url = west_wide;
        const north_upload_url = north_wide;
        const south_upload_url = south_wide;

        const project = {
          project_detail_id: this_data.project_detail_id,
          direction: this_data.direction,
          description: this_data.east,
          file_upload: "projectlocation/" + east_upload_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.project_detail_id); // Just before the db.query call

        console.log(project);
        const updateSql =
          "UPDATE `project_site_location` SET " +
          "`direction`='" +
          project.direction +
          "'," +
          "`description`='" +
          project.description +
          "'," +
          "`project_detail_id`='" +
          project.project_detail_id +
          "'," +
          "`file_upload`='" +
          project.file_upload +
          "'," +
          "`updated_at`='" +
          project.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project.updated_by) +
          " WHERE `direction`= 1 and `project_detail_id`=" +
          project_detail_id;
        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };
          }
        });

        const project2 = {
          project_detail_id: this_data.project_detail_id,
          direction: this_data.west_direction,
          description: this_data.west,
          file_upload: "projectlocation/" + west_upload_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.project_detail_id); // Just before the db.query call

        console.log(project2);
        const updateSql2 =
          "UPDATE `project_site_location` SET " +
          "`direction`='" +
          project2.direction +
          "'," +
          "`description`='" +
          project2.description +
          "'," +
          "`project_detail_id`='" +
          project2.project_detail_id +
          "'," +
          "`file_upload`='" +
          project2.file_upload +
          "'," +
          "`updated_at`='" +
          project2.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project2.updated_by) +
          " WHERE `direction`= 2  and `project_detail_id`=" +
          project_detail_id;
        db.query(updateSql2, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };
          }
        });

        const project3 = {
          project_detail_id: this_data.project_detail_id,
          direction: this_data.north_direction,
          description: this_data.north,
          file_upload: "projectlocation/" + north_upload_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.project_detail_id); // Just before the db.query call

        console.log(project3);
        const updateSql3 =
          "UPDATE `project_site_location` SET " +
          "`direction`='" +
          project3.direction +
          "'," +
          "`description`='" +
          project3.description +
          "'," +
          "`project_detail_id`='" +
          project3.project_detail_id +
          "'," +
          "`file_upload`='" +
          project3.file_upload +
          "'," +
          "`updated_at`='" +
          project3.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project3.updated_by) +
          " WHERE `direction`= 3 and `project_detail_id`=" +
          project_detail_id;
        db.query(updateSql3, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };

            // res.status(201).json(response);
          }
        });

        const project4 = {
          project_detail_id: this_data.project_detail_id,
          direction: this_data.south_direction,
          description: this_data.south,
          file_upload: "projectlocation/" + south_upload_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.project_detail_id); // Just before the db.query call

        console.log(project4);
        const updateSql4 =
          "UPDATE `project_site_location` SET " +
          "`direction`='" +
          project4.direction +
          "'," +
          "`description`='" +
          project4.description +
          "'," +
          "`project_detail_id`='" +
          project4.project_detail_id +
          "'," +
          "`file_upload`='" +
          project4.file_upload +
          "'," +
          "`updated_at`='" +
          project4.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project4.updated_by) +
          " WHERE `direction`= 4 and `project_detail_id`=" +
          project_detail_id;
        db.query(updateSql4, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };
          }
        });
      }
    });
    res.status(201).json("hello");
  },

  getLocation: async function (req, res) {
    //get current user
    var sql = "select * from project_site_location where is_deleted = 0";

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

  getProjectDetailsbyid: (req, res) => {
    try {
      const ID = req.params?.ID;

      if (parseInt(ID) != NaN) {
        var sql =
          "SELECT mp.id , m.title, m.disp_order, mp.title, mp.disp_order, m.is_deleted  FROM mst_project_type AS m  LEFT JOIN mst_project_subtype AS mp ON mp.mst_project_type_id = m.id   WHERE m.is_deleted = 0 AND m.id = " +
          ID +
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

  addProjectDetail: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;

    console.log("this_data==>", this_data);

    const project = {
      project_detail_id: this_data[0].project_detail_id,
      mst_project_subtype_id: this_data[0].mst_project_subtype_id,
      qty: this_data[0].qty,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project==>", project);

    db.query("INSERT INTO project_type SET ?", project, function (err, result) {
      if (err) {
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }

      const data = {
        error: false,
        message: "Project Details has been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      // res.status(201).json(data);
    });

    const project2 = {
      project_detail_id: this_data[1].project_detail_id,
      mst_project_subtype_id: this_data[1].mst_project_subtype_id,
      qty: this_data[1].qty,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project==>", project2);

    db.query(
      "INSERT INTO project_type SET ?",
      project2,
      function (err, result) {
        if (err) {
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        const data = {
          error: false,
          message: "Project Details has been added successfully.",
          data: {
            id: result.insertId,
          },
        };
      }
    );
    res.status(201).json("sdd");
  },

  getProjectsCheckboxbyid: (req, res) => {
    try {
      const ID = req.params?.ID;

      if (parseInt(ID) != NaN) {
        var sql =
          "select id,mst_project_subtype_id,qty from project_type where is_deleted = 0 and project_detail_id = " +
          ID +
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
  updateProjectDetail: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);

    var sql =
      "SELECT * from `project_type` WHERE `project_detail_id`=" +
      parseInt(this_data[0].project_detail_id) +
      "";
    console.log("project_detail_id==>", this_data[0].project_detail_id);

    db.query(sql, (err, result) => {
      if (err) {
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log(result);

        const user_id = req?.user?.id;
        const mst_project_subtype_id = this_data[0]?.mst_project_subtype_id;
        const mst_project_subtype = this_data[1]?.mst_project_subtype_id;

        // const file_upload_url = file_upload;

        const project = {
          project_detail_id: this_data[0].project_detail_id,
          mst_project_subtype_id: this_data[0].mst_project_subtype_id,
          qty: this_data[0].qty,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("qty:", project.qty); // Just before the db.query call

        console.log(project);
        const updateSql =
          "UPDATE `project_type` SET " +
          "`mst_project_subtype_id`='" +
          project.mst_project_subtype_id +
          "'," +
          "`qty`='" +
          project.qty +
          "'," +
          "`project_detail_id`='" +
          project.project_detail_id +
          "'," +
          "`updated_at`='" +
          project.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project.updated_by) +
          " WHERE `mst_project_subtype_id`=" +
          mst_project_subtype_id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project Detail has been updated...",
              data: {},
            };
          }
        });

        const project2 = {
          project_detail_id: this_data[1]?.project_detail_id,
          mst_project_subtype_id: this_data[1]?.mst_project_subtype_id,
          qty: this_data[1]?.qty,

          // file_upload: file_upload_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID2:", this_data[1].mst_project_subtype_id); // Just before the db.query call

        console.log("project2", project2);
        const updateSql2 =
          "UPDATE `project_type` SET " +
          "`mst_project_subtype_id`='" +
          project2.mst_project_subtype_id +
          "'," +
          "`qty`='" +
          project2.qty +
          "'," +
          "`project_detail_id`='" +
          project2.project_detail_id +
          "'," +
          "`updated_at`='" +
          project2.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project2.updated_by) +
          " WHERE `mst_project_subtype_id`=" +
          mst_project_subtype;

        db.query(updateSql2, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            // res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project has been updated...",
              data: {},
            };
          }
        });
      }
    });
    res.status(201).json("hello");
  },

  getprojectqty: (req, res) => {
    try {
      const ID = req.params?.ID;

      if (parseInt(ID) != NaN) {
        var sql =
          "select pt.project_detail_id,pt.mst_project_subtype_id,pt.qty,mst.mst_project_type_id,mst.title, (SELECT COUNT(*) FROM mst_project_subtype WHERE mst_project_type_id = " +
          ID +
          ") AS response_length from mst_project_subtype as mst left join project_type as pt on pt.mst_project_subtype_id = mst.id where pt.is_deleted = 0 and mst_project_type_id = " +
          ID +
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

  addallplans: function (req, res) {
    const user_id = req.user ? req.user.id : null;
    const this_data = req.body;
    console.log("this_data==>", this_data);

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    console.log("Uploaded files:", req.files);

    const files = [];
    console.log("length==>", this_data.length);
    const count = this_data.length;

    for (j = 1; j <= count; j++) {
      let i = 0;
      req.files.forEach((file) => {

        if (file.fieldname === "file_upload" + j + "[" + i + "]") {
          console.log("file_upload" + j + "[" + i + "]");

          files.push(getImageWithFoldername(file.path));
        } else {
          i = -1;
        }

        i = i + 1;
      });
    }
    // if (!plan) {
    //   unlinkMultipleImages(files);
    //   return res.status(400).json({
    //     error: true,
    //     message: "Please upload the google image.",
    //     data: {},
    //   });
    // }

    const insertData = [];
    let plannameCounter = 0;
    let planname2Counter = 0;

    // Merge planname and planname2 arrays into a single array
    const mergedPlanNames = this_data.planname.concat(this_data.planname2);
    const mergedProjectTypeIds = [
      this_data.project_type_id,
      this_data.project_type_id2,
    ];
    const client = this_data.show.concat(this_data.show1);
    console.log("client===>", client);

    // for (let i = 0; i < mergedPlanNames.length; i++) {
    for (
      let i = 0;
      i < Math.max(mergedProjectTypeIds.length, mergedPlanNames.length);
      i++
    ) {
      const project = {
        project_detail_id: this_data.project_detail_id,
        project_type_id: mergedProjectTypeIds[i],
        title: mergedPlanNames[i], // Use merged plan names
        show_client: client[i],
        is_finalize: this_data.is_finalize,
        file_upload: "allplans/" + files[i],
        created_by: user_id,
        created_at: getCurrentDateAndTime(),
        updated_at: null,
        updated_by: null,
        is_deleted: 0,
      };
      if (plannameCounter < this_data.planname.length) {
        project.project_type_id = this_data.project_type_id;
        plannameCounter++;
      } else if (planname2Counter < this_data.planname2.length) {
        project.project_type_id = this_data.project_type_id2;
        planname2Counter++;
      }
      console.log("projecxt[[[>", project);
      insertData.push([
        project.project_detail_id,
        project.project_type_id,
        project.title,
        project.show_client,
        project.is_finalize,
        project.file_upload,
        project.created_by,
        project.created_at,
        project.updated_at,
        project.updated_by,
        project.is_deleted,
      ]);
    }

    // Insert multiple rows into the database
    const query =
      "INSERT INTO project_types_details (project_detail_id, project_type_id, title, show_client, is_finalize,file_upload, created_by, created_at, updated_at, updated_by, is_deleted) VALUES ?";

    db.query(query, [insertData], function (err, result) {
      if (err) {
        unlinkMultipleImages(files);
        return res
          .status(500)
          .json({ error: true, message: err.sqlMessage, data: {} });
      }
      const data = {
        error: false,
        message: "Project Details have been added successfully.",
        data: {
          id: result.insertId,
        },
      };
      res.status(201).json(data); // Send the response here
    });
  },

  getallplansbyid: (req, res) => {
    try {
      const ID = req.params?.ID;

      if (parseInt(ID) != NaN) {
        var sql =
          "select * from project_types_details where is_deleted = 0 and project_detail_id = " +
          ID +
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

  updateallplans: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body.obj));
    console.log("Request Body:", this_data);

    const user_id = req?.user?.id;

    // Check if planname, show, and show1 arrays are defined and have the same length
    if (
      this_data.planname &&
      Array.isArray(this_data.planname) &&
      this_data.show &&
      Array.isArray(this_data.show) &&
      this_data.show1 &&
      Array.isArray(this_data.show1) &&
      this_data.planname.length === this_data.show.length &&
      this_data.planname2 &&
      Array.isArray(this_data.planname2) &&
      this_data.planname2.length === this_data.show1.length
    ) {
      for (let i = 0; i < this_data.planname.length; i++) {
        const planname = this_data.planname[i];
        const show = this_data.show[i];

        const project = {
          project_detail_id: this_data.project_detail_id,
          show_client: show,
          title: planname,
          is_finalize: this_data.is_finalize,
          project_type_id: this_data.project_type_id,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };

        const updateSql =
          "UPDATE `project_types_details` SET " +
          "`show_client`='" +
          project.show_client +
          "'," +
          "`title`='" +
          project.title +
          "'," +
          "`is_finalize`='" +
          project.is_finalize +
          "'," +
          "`project_type_id`='" +
          project.project_type_id +
          "'," +
          "`updated_at`='" +
          project.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project.updated_by) +
          " WHERE `project_type_id`=" +
          project.project_type_id;

        db.query(updateSql, (err, result) => {
          if (err) {
            console.error("Error updating row:", err);
          } else {
            console.log("Row updated:", result);
          }
        });
      }

      for (let i = 0; i < this_data.planname2.length; i++) {
        const planname2 = this_data.planname2[i];
        const show1 = this_data.show1[i];

        const project2 = {
          project_detail_id: this_data.project_detail_id,
          show_client: show1,
          title: planname2,
          is_finalize: this_data.is_finalize,
          project_type_id: this_data.project_type_id2,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };

        const updateSql2 =
          "UPDATE `project_types_details` SET " +
          "`show_client`='" +
          project2.show_client +
          "'," +
          "`title`='" +
          project2.title +
          "'," +
          "`is_finalize`='" +
          project2.is_finalize +
          "'," +
          "`project_type_id`='" +
          project2.project_type_id +
          "'," +
          "`updated_at`='" +
          project2.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project2.updated_by) +
          " WHERE `project_type_id`=" +
          project2.project_type_id;

        db.query(updateSql2, (err, result) => {
          if (err) {
            console.error("Error updating row:", err);
          } else {
            console.log("Row updated:", result);
          }
        });
      }
    } else {
      console.error("Arrays have different lengths or are not defined.");
    }

    res.status(201).json("hello");
  },

  getAllPlans: async function (req, res) {
    //get current user
    var sql = "select * from project_types_details where is_deleted = 0";

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

  addProjectPlan: function (req, res) {
    // Check if files are uploaded
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ error: true, message: "Please upload the receipt.", data: {} });
    }

    console.log("Uploaded files:", req.files);

    const files = [];

    let plan = "";

    req.files.forEach((file) => {
      if (file.fieldname === "plan") {
        console.log("file.fieldname", file.fieldname);
        plan = getImageWithname(file.path);
        files.push(plan);
        console.log("  files.push==>", plan);
      } else {
        // Unlink unnecessary files
        unlinkImage(file.path);
      }
    });
    console.log("plan--->", plan);

    if (!plan) {
      unlinkMultipleImages(files);
      return res.status(400).json({
        error: true,
        message: "Please upload the google image.",
        data: {},
      });
    }

    const user_id = req.user ? req.user.id : null;
    // const this_data = req.body;

    // console.log("this_data==>", this_data);

    const project = {
      plan: "projectplan/" + plan,
      created_by: user_id,
      created_at: getCurrentDateAndTime(),
      updated_at: null,
      updated_by: null,
      is_deleted: 0,
    };
    console.log("project==>", project);

    db.query(
      "INSERT INTO project_detail_new SET ?",
      project,
      function (err, result) {
        if (err) {
          // Handle error and return response
          unlinkMultipleImages(files);
          return res
            .status(500)
            .json({ error: true, message: err.sqlMessage, data: {} });
        }

        // If insertion is successful, you can send a success response here
        const data = {
          error: false,
          message: "Project Details has been added successfully.",
          data: {
            id: result.insertId,
            // Include any other relevant data you want to send
          },
        };
        res.status(201).json(data);
      }
    );
    // }
  },

  updateProjectPlan: function (req, res) {
    const this_data = JSON.parse(JSON.stringify(req.body));
    console.log("Request Body:", this_data);
    var oldFiles = [];
    var newFiles = [];
    var plan = "";
    //console.log("google_image789--->", req);
    if (req.files.length > 0) {
      req.files.forEach((f) => {
        if (f.fieldname === "plan") {
          console.log("google_image789--->", f.fieldname);
          plan = getImageWithFoldername(f.path);
          newFiles.push(plan);
        } else {
          /*Remove others name images*/
          unlinkSingleImage(getImageWithFoldername(f.path));
        }
      });
    }
    console.log("plan1234--->", plan);
    console.log("Uploaded Files:", req.files);

    var sql =
      "SELECT * from `mst_file` WHERE `id`=" + parseInt(this_data.id) + "";
    console.log("id==>", this_data.id);

    db.query(sql, (err, result) => {
      if (err) {
        unlinkMultipleImages(newFiles);
        var data = { error: true, message: err.sqlMessage, data: {} };
        res.status(201).send(data);
      } else {
        console.log("result==>", result);

        plan ? oldFiles.push(result[0].plan) : (plan = result[0].plan);

        const user_id = req?.user?.id;
        const id = this_data?.id;

        const plan_image_url = plan;
        console.log("google_image_url==>", plan_image_url);

        const project = {
          plan: "projectplan/" + plan_image_url,
          updated_at: getCurrentDateAndTime(),
          updated_by: user_id,
        };
        console.log("ID:", this_data.id); // Just before the db.query call

        console.log(project);
        const updateSql =
          "UPDATE `mst_file` SET " +
          "`project_plan`='" +
          project.plan +
          "'," +
          "`updated_at`='" +
          project.updated_at +
          "'," +
          "`updated_by`=" +
          parseInt(project.updated_by) +
          " WHERE `id`=" +
          id;

        db.query(updateSql, (err, result) => {
          if (err) {
            const data = { error: true, message: err.sqlMessage, data: {} };
            res.status(500).json(data);
          } else {
            const response = {
              error: false,
              message: "Project  plan has been updated...",
              data: {},
            };

            res.status(201).json(response);
          }
        });
      }
    });
  },

 
};
