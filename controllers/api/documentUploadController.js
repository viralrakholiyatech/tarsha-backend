const { frontEndUrl } = require("../../helpers/constants");
const {
  unlinkMultipleImages,
  getImageWithFoldername,
} = require("../../services/FileService");
const {
  fileStageEmailTemplate,
  sendEmail,
} = require("../../services/MailService");
const {
  filter_string,
  isValidJson,
  skipStagesMessage,
} = require("../../services/Utility");
const commonController = require("./commonController");

module.exports = {
  get_document_upload: (req, res) => {
    try {
      const mst_file_id = req.params?.id;
      console.log("mst_file_id==>", mst_file_id);

      var sql =
        "SELECT `file_document_json` from `mst_file` where `id`=" +
        mst_file_id +
        "";
      

      db.query(sql, (err, result) => {
        if (err) {
          console.log(err);
          res
            .status(200)
            .json({ message: err.sqlMessage, error: true, data: {} });
        } else if (result.length > 0) {
          const obj = JSON.parse(result[0].file_document_json);
          const arr = [];
          for (let value of obj) {
            if (value?.checked) {
              arr.push(value?.mst_document_id);
            }
          }

          if (arr.length > 0) {
            var sql0 =
              "SELECT * FROM `mst_document` where `id` in(" +
              arr.toString() +
              ")";
            var sql1 =
              "SELECT * FROM `file_document_upload` where `mst_file_id`=" +
              mst_file_id +
              " and `is_deleted`=0 order by `id` ASC";

            db.query(sql0, (err, result0) => {
              if (err) {
                console.log(err);
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                db.query(sql1, (err, result1) => {
                  if (err) {
                    console.log(err);
                    res
                      .status(201)
                      .json({ error: true, message: err.sqlMessage, data: {} });
                  } else {
                    const finalData = [];

                    result0.forEach((e1, i1) => {
                      finalData.push({
                        id: null,
                        mst_document_id: e1?.id,
                        mst_file_id: mst_file_id,
                        document_name: e1?.doc_name,
                        show_website: 0,
                        document_path: "",
                        is_save: 0,
                        created_at:e1.created_at,
                        card:e1.card,
                        input: false,
                      });
                    });

                    const newData = [];

                    result1.forEach((e1, i1) => {
                      finalData.forEach((e2, i2) => {
                        if (e1?.mst_document_id == e2?.mst_document_id) {
                          e2.id = e1?.id ? e1?.id : null;
                          e2.document_name = e1.document_name;
                          e2.show_website = e1.show_website;
                          e2.remark_by_hod= e1.remark_by_hod,
                          e2.remark_by_emp=e1.remark_by_emp,
                          e2.approved_by_hod= e1.approved_by_hod === 1 ? "Yes" : "No" ,
                          e2.document_path = e1.document_path;
                          e2.created_at=e1.created_at,
                          e2.card=e1.card,
                          e2.is_save = e1.is_save;
                        }
                      });
                    });

                    let shouldAdd = true;

                    for (const e of result1) {
                      if (e?.mst_document_id == null) {
                        if (
                          e?.document_name?.length > 0 &&
                          e?.document_name?.trim() == "Google Image Link"
                        ) {
                          newData.push({
                            id: e.id,
                            mst_document_id: null,
                            mst_file_id: mst_file_id,
                            document_name: e?.document_name,
                            remark_by_hod: e.remark_by_hod,
                            remark_by_emp: e.remark_by_emp,
                            approved_by_hod: e.approved_by_hod === 1 ? "Yes" : "No",
                            show_website: e?.show_website,
                            document_path: e?.document_path,
                            card:e?.card,
                            input: false,
                          });

                          shouldAdd = false;
                        } else {
                          newData.push({
                            id: e.id,
                            mst_document_id: null,
                            mst_file_id: mst_file_id,
                            remark_by_hod: e.remark_by_hod,
                            remark_by_emp: e.remark_by_emp,
                            approved_by_hod: e.approved_by_hod === 1 ? "Yes" : "No",
                            document_name: e?.document_name,
                            show_website: e?.show_website,
                            document_path: e?.document_path,
                            card:e?.card,
                            input: true,
                          });
                        }
                      }
                    }
  
                    if (shouldAdd) {
                      newData.push({
                        id: null,
                        mst_document_id: null,
                        mst_file_id: mst_file_id,
                        // remark_by_hod:remark_by_hod,
                        //     remark_by_emp:remark_by_emp,
                        //     approved_by_hod: approved_by_hod === 1 ? "Yes" : "No",
                        document_name: "Google Image Link",
                        show_website: 0,
                        document_path: "",
                        card:e?.card,
                        input: false,
                      });
                    }

                    res.status(201).json({
                      error: false,
                      message: "Record found...",
                      data: [...finalData, ...newData],
                      data1: result0,
                      data2: result1,
                    });
                  }
                });
              }
            });
          } else {
            res
              .status(200)
              .json({ message: "Not found", error: false, data: [] });
          }
        } else {
          res
            .status(200)
            .json({ message: "Not found", error: false, data: [] });
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },

  // get_document_upload: (req, res) => {
  //   try {
  //     const mst_file_id = req.params?.id;

  //     var sql =
  //       "SELECT `file_document_json` from `mst_file` where `id`=" +
  //       mst_file_id +
  //       "";

  //     db.query(sql, (err, result) => {
  //       if (err) {
  //         console.log(err);
  //         res
  //           .status(200)
  //           .json({ message: err.sqlMessage, error: true, data: {} });
  //       } else if (result.length > 0) {
  //         const obj = JSON.parse(result[0].file_document_json);

  //         const arr = [];
  //         for (let value of obj) {
  //           if (value?.checked) {
  //             arr.push(value?.mst_document_id);
  //           }
  //         }

  //         if (arr.length > 0) {
  //           var sql0 =
  //             "SELECT * FROM mst_document where id in(" + arr.toString() + ")";
  //           var sql1 =
  //             "SELECT * FROM file_document_upload where mst_file_id=" +
  //             mst_file_id +
  //             " and is_deleted=0 order by id ASC";
  //           console.log("sql0 =====>", sql0 + ";" + sql1);
  //           db.query(sql0 + ";" + sql1, (err, result) => {
  //             if (err) {
  //               console.log(err);
  //               res
  //                 .status(201)
  //                 .json({ error: true, message: err.sqlMessage, data: {} });
  //             } else {
  //               const finalData = [];

  //               result[0].forEach((e1, i1) => {
  //                 finalData.push({
  //                   id: null,
  //                   mst_document_id: e1?.id,
  //                   mst_file_id: mst_file_id,
  //                   document_name: e1?.doc_name,
  //                   show_website: 0,
  //                   document_path: "",
  //                   is_save: 0,
  //                   input: false,
  //                 });
  //               });

  //               const newData = [];

  //               result[1].forEach((e1, i1) => {
  //                 finalData.forEach((e2, i2) => {
  //                   if (e1?.mst_document_id == e2?.mst_document_id) {
  //                     e2.id = e1?.id ? e1?.id : null;
  //                     e2.document_name = e1.document_name;
  //                     e2.show_website = e1.show_website;
  //                     e2.document_path = e1.document_path;
  //                     e2.is_save = e1.is_save;
  //                   }
  //                 });
  //               });

  //               let shouldAdd = true;

  //               for (const e of result[1]) {
  //                 if (e?.mst_document_id == null) {
  //                   if (
  //                     e?.document_name?.length > 0 &&
  //                     e?.document_name?.trim() == "Google Image Link"
  //                   ) {
  //                     newData.push({
  //                       id: e.id,
  //                       mst_document_id: null,
  //                       mst_file_id: mst_file_id,
  //                       document_name: e?.document_name,
  //                       show_website: e?.show_website,
  //                       document_path: e?.document_path,
  //                       input: false,
  //                     });

  //                     shouldAdd = false;
  //                   } else {
  //                     newData.push({
  //                       id: e.id,
  //                       mst_document_id: null,
  //                       mst_file_id: mst_file_id,
  //                       document_name: e?.document_name,
  //                       show_website: e?.show_website,
  //                       document_path: e?.document_path,
  //                       input: true,
  //                     });
  //                   }
  //                 }
  //               }

  //               if (shouldAdd) {
  //                 newData.push({
  //                   id: null,
  //                   mst_document_id: null,
  //                   mst_file_id: mst_file_id,
  //                   document_name: "Google Image Link",
  //                   show_website: 0,
  //                   document_path: "",
  //                   input: false,
  //                 });
  //               }

  //               res.status(201).json({
  //                 error: false,
  //                 message: "Record found...",
  //                 data: [...finalData, ...newData],
  //                 data1: result[0],
  //                 data2: result[1],
  //               });
  //             }
  //           });
  //         } else {
  //           res
  //             .status(200)
  //             .json({ message: "Not found", error: false, data: [] });
  //         }
  //       } else {
  //         res
  //           .status(200)
  //           .json({ message: "Not found", error: false, data: [] });
  //       }
  //     });
  //   } catch (err) {
  //     res.status(200).json({ message: "Server error", error: true, data: {} });
  //   }
  // },
  save_document_upload: async (req, res) => {
    try {
      const data = JSON.parse(req.body?.data);
      const allData = data;
      const files = req?.files;
      console.log("gfdgdgd==>",req.body);
      console.log(files);

      const is_save = req.body?.is_save;
      const mst_file_id = data[0]?.mst_file_id;

      const filePathArray = [];
      var paths = [];

      if (req?.files.length > 0) {
        req.files.forEach((f) => {
          filePathArray.push({
            fieldname: f?.fieldname,
            path: getImageWithFoldername(f?.path),
          });
          paths.push(getImageWithFoldername(f?.path));
        });
      }

      if (Array.isArray(allData)) {
        for (let d of allData) {
          let documents = "";

          if (filePathArray.length && Array.isArray(filePathArray)) {
            filePathArray.forEach((p) => {
              if (p?.fieldname.split("_")[0] == d?.index) {
                documents = p?.path;
              }
            });
          }

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
            // If the difference is 0 or 17  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 1 ) {
            // If the difference is greater than 17  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }

          const values = {
            id: d?.id != null ? d?.id : null,
            mst_company_id: req.user?.comp_id ? req.user?.comp_id : null,
            mst_file_id: d?.mst_file_id,
            mst_document_id:
              d?.mst_document_id != null ? d?.mst_document_id : null,
            remark_by_hod: req.body.remark_by_hod,
            remark_by_emp: req.body.remark_by_emp,
            approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
            document_name:
              d?.document_name && d?.document_name?.length > 0
                ? filter_string(d?.document_name?.trim())
                : null,
            document_path:
              d?.document_url != undefined
                ? d?.document_url
                : documents
                ? "document_upload/" + documents
                : null,
                card: req.body.card ? req.body.card : cardColor,
            is_save: is_save,
            show_website:
              d?.show_website == 1 || d?.show_website == 0
                ? d?.show_website
                : 0,
            created_at: getCurrentDateAndTime(),
            created_by: req.user?.id,
            is_google_image_link: d?.document_url != undefined ? true : false,
          };

          if (values.id != null) {
            //Update
            var sql =
              "SELECT *from `file_document_upload` WHERE `id`=" +
              values.id +
              "";
            db.query(sql, (err, result) => {
              if (err) {
                console.log(err);
              } else if (result.length > 0) {
                if (result[0]?.is_save == 1 || result[0]?.is_skip == 1) {
                  delete values.is_save;
                }

                delete values?.mst_file_id;
                delete values.created_at;
                delete values.created_by;

                let updatedData = {};

                if (values?.is_google_image_link) {
                  console.log("This line");
                  delete values.is_google_image_link;
                  updatedData = {
                    ...values,
                    updated_at: getCurrentDateAndTime(),
                    updated_by: req.user?.id,
                  };
                  var sql =
                    "UPDATE `file_document_upload` SET ? WHERE `id`=" +
                    values.id +
                    "";

                  db.query(sql, updatedData, (err, result) => {
                    if (err) {
                      console.log(err);
                    }
                  });
                } else {
                  console.log("That line");
                  delete values.is_google_image_link;
                  updatedData = {
                    ...values,
                    updated_at: getCurrentDateAndTime(),
                    updated_by: req.user?.id,

                    document_path:
                      values?.document_path != null
                        ? values?.document_path
                        : result[0]?.document_path,
                  };

                  var sql =
                    "UPDATE `file_document_upload` SET ? WHERE `id`=" +
                    values.id +
                    "";
                  db.query(sql, updatedData, (err, result) => {
                    if (err) {
                      console.log(err);
                    }
                  });
                }
              }
            });
          } else {
            //Insert
            delete values.id;
            delete values?.is_google_image_link;

            var sql = "INSERT INTO `file_document_upload` SET ?";
            shouldUpdateStage = true;
            db.query(sql, values, (err, result) => {
              if (err) {
                console.log(err);
              }
            });
          }
        }

        if (is_save == 1) {
          const fileData = await commonController.getMstFileByMstFileId(
            parseInt(mst_file_id)
          );

          /*Send Email*/
          await sendEmail({
            subject: "File stage Updated",
            html: fileStageEmailTemplate({
              file_name: fileData[0]?.file_name,
              from_stage: "Document Upload",
              to_stage: "Road Deposit/Scrunity Fees",
              url: `${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`,
            }),
          });
          commonController.updateMstFileStage(8, mst_file_id);
          res.status(200).json({
            message: "Changes saved!",
            error: false,
            data: { skip: 1 },
          });
        } else {
          res.status(200).json({
            message: "Changes saved!",
            error: false,
            data: { skip: 0 },
          });
        }
      }
    } catch (err) {
      console.log(err);
      paths.length ? unlinkMultipleImages(paths) : "";
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
  save_and_next_document_upload: (req, res) => {
    try {
    } catch (err) {
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
  getValueFromObjectArray: async (arr, key_id, value, return_key) => {
    for (const e of arr) {
      if (e[key_id] == value) {
        return e[return_key];
      }
    }
  },
  skip_document_upload: (req, res) => {
    try {
      const mst_file_id = req.params?.id;

      var sql =
        "SELECT *from `file_document_upload` WHERE `mst_file_id`=" +
        mst_file_id +
        "";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, data: {}, error: true });
        } else if (result.length > 0) {
          const alreadySkipped = result.some(
            (r) => r?.is_save == 1 || r?.is_skip == 1
          );

          const data = {
            is_save: 1,
            is_skip: 1,
            updated_at: getCurrentDateAndTime(),
            updated_by: req.user?.id,
          };

          var sql =
            "UPDATE `file_document_upload` SET ? WHERE `mst_file_id`=" +
            mst_file_id +
            "";

          db.query(sql, data, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, data: {}, error: true });
            } else {
              if (!alreadySkipped) {
                commonController.updateMstFileStage(8, mst_file_id);
                res.status(200).json({
                  message: "You've Skipped",
                  data: { skip: 1 },
                  error: false,
                });
              } else {
                res.status(200).json({
                  message: "You've Skipped",
                  data: { skip: 0 },
                  error: false,
                });
              }
            }
          });
        } else {
          //Insert

          console.log("Insert Line");

          var sql =
            "SELECT `file_document_json` from `mst_file` where `id`=" +
            mst_file_id +
            "";

          db.query(sql, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else {
              var sql = "SELECT *from `mst_document` WHERE `category`='File'";

              db.query(sql, async (err, result) => {
                if (err) {
                  console.log(err);
                } else {
                  const jsonObject = isValidJson(result[0]?.file_document_json);
                  if (jsonObject != null) {
                    for (const e of jsonObject) {
                      console.log(e);
                      if (e?.checked == 1) {
                        const doc_name =
                          await module.exports.getValueFromObjectArray(
                            result,
                            "id",
                            e?.mst_document_id,
                            "doc_name"
                          );

                        const d = {
                          mst_file_id: mst_file_id,
                          mst_document_id: e?.mst_document_id,
                          document_name: doc_name,
                          is_save: 1,
                          is_skip: 1,
                          created_at: getCurrentDateAndTime(),
                          created_by: req.user?.id,
                        };

                        var sql = "INSERT INTO `file_document_upload` SET ?";
                        db.query(sql, d, (err, result) => {
                          if (err) {
                            console.log(err);
                          } else {
                            console.log("Added");
                          }
                        });
                      }
                    }
                  } else {
                    var sql = "INSERT INTO `file_document_upload` SET ?";

                    db.query(
                      sql,
                      {
                        mst_document_id: null,
                        document_name: "Google Image Link",
                        mst_file_id: mst_file_id,
                        show_website: 0,
                        document_path: "",
                        is_save: 1,
                        is_skip: 1,
                        created_at: getCurrentDateAndTime(),
                        created_by: req?.user?.id,
                      },
                      (err, result) => {
                        if (err) {
                          console.log(err);
                        } else {
                          console.log("Added");
                        }
                      }
                    );
                  }
                }
              });

              commonController.updateMstFileStage(8, mst_file_id);
              res.status(200).json({
                message: "You've Skipped",
                data: { skip: 1 },
                error: false,
              });
            }
          });
        }
      });
    } catch (err) {}
  },
  remove_document_upload: (req, res) => {
    try {
      const id = req.params?.id;

      var sql =
        "SELECT *from `file_document_upload` WHERE `id`=" +
        id +
        " and `mst_document_id` is null";

      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(200)
            .json({ message: err.sqlMessage, data: {}, error: true });
        } else if (result.length > 0) {
          const data = {
            is_deleted: 1,
            updated_at: getCurrentDateAndTime(),
            updated_by: req.user?.id,
          };

          var sql = "UPDATE `file_document_upload` SET ? WHERE `id`=" + id + "";

          db.query(sql, data, (err, result) => {
            if (err) {
              res
                .status(200)
                .json({ message: err.sqlMessage, data: {}, error: true });
            } else {
              res
                .status(200)
                .json({ message: "Removed!", data: {}, error: false });
            }
          });
        } else {
          res
            .status(200)
            .json({ message: "Can't be removed", data: {}, error: true });
        }
      });
    } catch (err) {
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
};
