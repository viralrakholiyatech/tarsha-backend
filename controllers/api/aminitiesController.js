const { frontEndUrl } = require("../../helpers/constants");
const {
  unlinkMultipleImages,
  getImageWithFoldername,
} = require("../../services/FileService");
const {
  sendEmail,
  fileStageEmailTemplate,
} = require("../../services/MailService");
const { filter_string, isValidJson } = require("../../services/Utility");
const commonController = require("./commonController");

module.exports = {
  return_file_path_by_index: (filePathArray, index, type = "type1") => {
    let documents = "";
    if (filePathArray.length && Array.isArray(filePathArray)) {
      filePathArray.forEach((p) => {
        if (
          p?.fieldname.split("_")[0] == index &&
          p?.fieldname.split("_")[1] == type
        ) {
          documents = p?.path;
        }
      });
    }

    return documents;
  },
  get_aminities: (req, res) => {
    var sql =
      "SELECT `id`,`mst_company_id`,`card`,`mst_file_id`,`remark_by_hod`,`remark_by_emp`,`approved_by_hod`,`amount`,`emi`,`emi_data`,`is_type`,`is_save`,`created_at` FROM `file_aminities_fees` WHERE `mst_file_id`=" +
      req.params?.id +
      "";

    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(200)
          .json({ message: err.sqlMessage, data: {}, error: true });
      } else {
        res
          .status(200)
          .json({ message: "Record fetched", data: result, error: false });
      }
    });
  },
  save_aminities: (req, res) => {
    try {
      const filePathArray = [];
      var paths = [];
      const data = JSON.parse(req.body?.data);
      console.log("req.body==>", req.body);
      var fsiJsonData = JSON.parse(req.body?.fsi_json);
      var icJsonData = JSON.parse(req.body?.ic_json);
      const is_save = req.body?.is_save;

      const fileDate = new Date(req.body.date); // Assuming 'd' represents each object in the 'data' array

      console.log("fileDate==>", fileDate);

      const createdDate = new Date(getCurrentDateAndTime());
      console.log("createdDate-->", createdDate);

      // Calculate the difference in milliseconds between the two dates
      const timeDifference = Math.abs(createdDate - fileDate);
      console.log("timeDifference-->", timeDifference);

      // Convert the time difference from milliseconds to days
      const differenceInDays = Math.ceil(
        timeDifference / (1000 * 60 * 60 * 24)
      );
      console.log("differenceInDays-->", differenceInDays);

      // Assign red or green card based on the condition
      let cardColor;
      if (differenceInDays <= 1 ) {
        // If the difference is 0 or 1  days, give a green card
        cardColor = "green";
      } else if (differenceInDays > 1 ) {
        // If the difference is greater than 1  days, give a red card
        cardColor = "red";
      } else {
        cardColor = "red";
      }

      if (req?.files.length > 0) {
        req.files.forEach((f) => {
          filePathArray.push({
            fieldname: f?.fieldname,
            path: getImageWithFoldername(f?.path),
          });
          paths.push(getImageWithFoldername(f?.path));
        });
      }

      console.log(req?.files);

      var sql1 =
        "SELECT *from `file_aminities_fees` WHERE `is_type`=1 and `mst_file_id`=" +
        data?.mst_file_id +
        "";
      var sql2 =
        "SELECT *from `file_aminities_fees` WHERE `is_type`=2 and `mst_file_id`=" +
        data?.mst_file_id +
        "";

      db.query(sql1, async (err, result1) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, data: {}, error: true });
        } else {
          db.query(sql2, async (err, result2) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, data: {}, error: true });
            } else {
              try {
                if (result1.length > 0 && result2.length > 0) {
                  const fsi_result = result1;
                  const ic_result = result2;

                  const fsi_updated_data = {
                    mst_company_id: req.user?.comp_id,
                    mst_file_id: data?.mst_file_id,
                    amount:
                      data?.fsi_amount != undefined &&
                      data?.fsi_amount != null &&
                      parseFloat(data?.fsi_amount) != NaN
                        ? data?.fsi_amount
                        : null,
                    emi:
                      data?.fsi_emi != undefined && data?.fsi_emi != null
                        ? data?.fsi_emi
                        : null,
                        card:cardColor,
                    remark_by_hod: req.body.remark_by_hod,
                    remark_by_emp: req.body.remark_by_emp,
                    approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
                  };

                  const ic_updated_data = {
                    mst_company_id: req.user?.comp_id,
                    mst_file_id: data?.mst_file_id,
                    amount:
                      data?.ic_amount != undefined &&
                      data?.ic_amount != null &&
                      parseFloat(data?.ic_amount) != NaN
                        ? data?.ic_amount
                        : null,
                    emi:
                      data?.ic_emi != undefined && data?.ic_emi != null
                        ? data?.ic_emi
                        : null,
                        card:cardColor,
                    remark_by_hod: req.body.remark_by_hod,
                    remark_by_emp: req.body.remark_by_emp,
                    approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
                  };

                  try {
                    let oldJsonData = isValidJson(fsi_result.emi_data);

                    // console.log(oldJsonData);

                    let updatedData = {
                      mst_company_id: req.user?.comp_id,
                      emi:
                        data?.fsi_emi != undefined && data?.fsi_emi != null
                          ? data?.fsi_emi
                          : null,
                      emi_data: JSON.stringify(fsiJsonData),
                      is_save: is_save,
                      card: req.body.card ? req.body.card : cardColor,
                      amount:
                        data?.fsi_amount != undefined &&
                        data?.fsi_amount != null &&
                        parseFloat(data?.fsi_amount) != NaN
                          ? data?.fsi_amount
                          : null,
                      remark_by_hod: req.body.remark_by_hod,
                      remark_by_emp: req.body.remark_by_emp,
                      approved_by_hod:
                        req.body.approved_by_hod === "Yes" ? 1 : 0,
                    };

                    //Type 1
                    if (oldJsonData != null) {
                      fsiJsonData.forEach((e1, i1) => {
                        oldJsonData.forEach((e2, i2) => {
                          if (e1?.index == e2?.index) {
                            const file =
                              module.exports.return_file_path_by_index(
                                filePathArray,
                                e1?.index,
                                "type1"
                              );
                            e1.document_path = file
                              ? "aminities/" + file
                              : e2?.document_path;
                          }
                        });
                      });

                      updatedData = {
                        ...updatedData,
                        emi_data: JSON.stringify(fsiJsonData),
                      };

                      console.log(updatedData);
                    } else {
                      const updatedFsiJsonData = [];

                      for (const e of fsiJsonData) {
                        let documents = "";

                        if (
                          filePathArray.length &&
                          Array.isArray(filePathArray)
                        ) {
                          filePathArray.forEach((p) => {
                            if (
                              p?.fieldname.split("_")[0] == e?.index &&
                              p?.fieldname.split("_")[1] == "type1"
                            ) {
                              documents = p?.path;
                            }
                          });
                        }

                        updatedFsiJsonData.push({
                          ...e,
                          document_path: documents ? documents : null,
                        });

                        updatedData = {
                          ...updatedData,
                          emi_data: JSON.stringify(updatedFsiJsonData),
                        };
                      }
                    }

                    //Type 2
                    let oldIcJsonData = isValidJson(ic_result.emi_data);

                    let updatedIcData = {
                      mst_company_id: req.user?.comp_id,
                      emi:
                        data?.ic_emi != undefined && data?.ic_emi != null
                          ? data?.ic_emi
                          : null,
                      emi_data: JSON.stringify(icJsonData),
                      is_save: is_save,
                      amount:
                        data?.ic_amount != undefined &&
                        data?.ic_amount != null &&
                        parseFloat(data?.ic_amount) != NaN
                          ? data?.ic_amount
                          : null,
                      remark_by_hod: req.body.remark_by_hod,
                      remark_by_emp: req.body.remark_by_emp,
                      approved_by_hod:
                        req.body.approved_by_hod === "Yes" ? 1 : 0,
                        card: req.body.card ? req.body.card : cardColor,
                      updated_at: getCurrentDateAndTime(),
                      updated_by: req.user?.id,
                    };

                    if (oldIcJsonData != null) {
                      icJsonData.forEach((e1, i1) => {
                        oldJsonData.forEach((e2, i2) => {
                          if (e1?.index == e2?.index) {
                            const file =
                              module.exports.return_file_path_by_index(
                                filePathArray,
                                e1?.index,
                                "type2"
                              );
                            e1.document_path = file
                              ? "aminities/" + file
                              : e2?.document_path;
                          }
                        });
                      });

                      updatedIcData = {
                        ...updatedIcData,
                        emi_data: JSON.stringify(icJsonData),
                      };
                    } else {
                      const updatedIcJsonData = [];

                      for (const e of icJsonData) {
                        let documents = "";

                        if (
                          filePathArray.length &&
                          Array.isArray(filePathArray)
                        ) {
                          filePathArray.forEach((p) => {
                            if (
                              p?.fieldname.split("_")[0] == e?.index &&
                              p?.fieldname.split("_")[1] == "type2"
                            ) {
                              documents = p?.path;
                            }
                          });
                        }

                        updatedIcJsonData.push({
                          ...e,
                          document_path: documents ? documents : null,
                        });

                        updatedIcData = {
                          ...updatedIcData,
                          emi_data: JSON.stringify(updatedIcJsonData),
                        };
                      }
                    }

                    if (fsi_result?.is_save == 1 || ic_result?.is_save == 1) {
                      delete updatedData.is_save;
                      delete updatedIcData.is_save;
                    }

                    var sql =
                      "UPDATE `file_aminities_fees` SET ? WHERE `mst_file_id`=" +
                      fsi_updated_data.mst_file_id +
                      " and `is_type`=1";

                    db.query(sql, updatedData, (err, result) => {
                      if (err) {
                        console.log(err);
                      } else {
                      }
                    });

                    var sql =
                      "UPDATE `file_aminities_fees` SET ? WHERE `mst_file_id`=" +
                      ic_updated_data.mst_file_id +
                      " and `is_type`=2";

                    db.query(sql, updatedIcData, (err, result) => {
                      if (err) {
                        console.log(err);
                      } else {
                      }
                    });

                    if (
                      is_save == 1 &&
                      (fsi_result?.is_save != 1 || ic_result?.is_save != 1)
                    ) {
                      const fileData =
                        await commonController.getMstFileByMstFileId(
                          parseInt(data?.mst_file_id)
                        );

                      /*Send Email*/
                      await sendEmail({
                        subject: "File stage Updated",
                        html: fileStageEmailTemplate({
                          file_name: fileData[0]?.file_name,
                          from_stage: "F.S/I.C. - Amineties Fees",
                          to_stage: "Work Fee",
                          url: `${frontEndUrl.FileStageRouteUrl}/${data?.mst_file_id}`,
                        }),
                      });
                      commonController.updateMstFileStage(
                        16,
                        data?.mst_file_id
                      );
                      res
                        .status(200)
                        .json({
                          message: "Changes saved!",
                          error: false,
                          data: { skip: 1 },
                        });
                    } else {
                      res
                        .status(200)
                        .json({
                          message: "Changes saved!",
                          error: false,
                          data: { skip: 0 },
                        });
                    }
                  } catch (err) {
                    res
                      .status(200)
                      .json({
                        message: "Internal validation error",
                        error: true,
                        data: {},
                      });
                  }
                } else {
                  res
                    .status(200)
                    .json({
                      message: "File record doesn't exist",
                      error: true,
                      data: {},
                    });
                }
              } catch (err) {
                res
                  .status(200)
                  .json({
                    message: "Internal validation error",
                    error: true,
                    data: {},
                  });
              }
            }
          });
        }
      });
    } catch (err) {
      console.log(err);
      paths?.length ? unlinkMultipleImages(paths) : "";
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
  save_and_next_aminities: (req, res) => {
    try {
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
  skip_aminities: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      var sql =
        "SELECT *FROM `file_aminities_fees` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, data: {}, error: true });
        } else if (result.length > 0) {
          let shouldUpdateStage = result.some(
            (e) => e?.is_save == 1 || e?.is_skip == 1
          );

          const updatedData = {
            is_save: 1,
            is_skip: 1,
            updated_at: getCurrentDateAndTime(),
            updated_by: req.user?.id,
          };

          var sql =
            "UPDATE `file_aminities_fees` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            "";

          db.query(sql, updatedData, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, data: {}, error: true });
            } else {
              if (!shouldUpdateStage) {
                commonController.updateMstFileStage(16, mst_file_id);
                res
                  .status(200)
                  .json({
                    message: "You've skipped",
                    data: { skip: 1 },
                    error: false,
                  });
              } else {
                res
                  .status(200)
                  .json({
                    message: "You've skipped",
                    data: { skip: 0 },
                    error: false,
                  });
              }
            }
          });
        } else {
          commonController.initialEntry_to_file_aminities_fees(
            mst_file_id,
            req.user?.id,
            1
          );
          commonController.updateMstFileStage(16, mst_file_id);
          res
            .status(200)
            .json({
              message: "You've skipped",
              data: { skip: 1 },
              error: false,
            });
        }
      });
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
  delete_particular_emi: (req, res) => {
    try {
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
};
