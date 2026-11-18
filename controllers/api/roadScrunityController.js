const yup = require("yup");
const { frontEndUrl } = require("../../helpers/constants");
const {
  getImageWithFoldername,
  unlinkMultipleImages,
} = require("../../services/FileService");
const {
  fileStageEmailTemplate,
  sendEmail,
} = require("../../services/MailService");
const commonController = require("./commonController");
module.exports = {
  test: (req, res) => {
    res.status(200).json({ message: "Working...", error: false, data: {} });
  },
  // roadDepositScrunity: (req, res) => {

  //     const keyword = "road_scrunity";
  //     const mst_file_id = parseInt(req.params?.id);

  //     var sql1 = "SELECT *FROM `mst_type` WHERE types='" + keyword + "' order by display_order asc";
  //     var sql2 = "SELECT *FROM `file_road_scrunity` WHERE `mst_file_id`=" + mst_file_id + " and `is_rejected`=0";

  //     db.query(`${sql1};${sql2}`, (err, result) => {
  //         if (err) {
  //             console.log(err);
  //             res.status(200).json({ message: "An error occured, Please contact to admin", error: true, data: {} });
  //         } else {
  //             res.status(200).json({ message: "Record fetched", data1: result[0], data2: result[1], error: false });
  //         }
  //     });

  // },

  roadDepositScrunity: (req, res) => {
    const keyword = "road_scrunity";
    const mst_file_id = parseInt(req.params?.id);

    var sql1 =
      "SELECT * FROM `mst_type` WHERE types='" +
      keyword +
      "' ORDER BY display_order ASC"; 
    var sql2 =
      "SELECT * FROM `file_road_scrunity` WHERE `mst_file_id`=" +
      mst_file_id +
      " AND `is_rejected`=0";

    db.query(sql1, (err, result1) => {
      if (err) {
        console.log(err);
        res
          .status(200)
          .json({
            message: "An error occurred. Please contact the admin",
            error: true,
            data: {},
          });
      } else {
        db.query(sql2, (err, result2) => {
          if (err) {
            console.log(err);
            res
              .status(200)
              .json({
                message: "An error occurred. Please contact the admin",
                error: true,
                data: {},
              });
          } else {
            res
              .status(200)
              .json({
                message: "Record fetched",
                data1: result1,
                data2: result2,
                error: false,
              });
          }
        });
      }
    });
  },

  validJson: (stringJson) => {
    try {
      JSON.parse(stringJson);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  },
  validateRoadDeposit: (req, res) => {
    try {
    } catch (err) {
      console.log(err);
      return res
        .status(200)
        .json({ message: "Something went wrong", error: true, data: {} });
    }
  },
  saveRoadDepositScrunityTest: async (req, res) => {
    const mainData = JSON.parse(JSON.stringify(req.body.data));
    const allData = JSON.parse(mainData);
    const mst_file_id = req.body.mst_file_id;
    const isSaveAndNext = parseInt(req.body?.save_and_next);
    let isSave = 0;
    console.log(req.files);
    const filePathArray = [];
    const paths = [];

    if (req?.files.length > 0) {
      req.files.forEach((f) => {
        filePathArray.push({
          fieldname: f?.fieldname,
          path: getImageWithFoldername(f?.path),
        });
        paths.push(getImageWithFoldername(f?.path));
      });
    }

    console.log(mst_file_id);
    console.log(allData);
    console.log(filePathArray);

    // res.status(200).json({message:"Check",error:false,data:{}});

    try {
      if (Array.isArray(allData)) {
        for (let data of allData) {
          let documents = "";
          if (filePathArray.length && Array.isArray(filePathArray)) {
            filePathArray.forEach((p) => {
              if (p?.fieldname.split("_")[0] == data?.mst_type_id) {
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
            // If the difference is 0 or 1  days, give a green card
            cardColor = "green";
          } else if (differenceInDays > 1 ) {
            // If the difference is greater than 1  days, give a red card
            cardColor = "red";
          } else {
            cardColor = "red";
          }

          const values = {
            mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
            mst_file_id: parseInt(mst_file_id),
            mst_type_id: data?.mst_type_id, 
            amount: data?.amount ? parseFloat(data?.amount) : 0,
            remark_by_hod: req.body.remark_by_hod,
            remark_by_emp: req.body.remark_by_emp,
            approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
            is_active: data?.is_active ? parseInt(data?.is_active) : 0,
            show_website: data?.show_website ? parseInt(data?.show_website) : 0,
            documents: "road_scrunity/" + documents,
            card: req.body.card ? req.body.card : cardColor,
            document_upload_date: data?.document_upload_date,
            is_save: module.exports.validJson(data?.is_save)
              ? data?.is_save
              : JSON.stringify({ save: 0, send_msg: 0, next: 0 }),
            is_rejected: 0,
            created_by: req?.user?.id ? req?.user?.id : 0,
            created_at: getCurrentDateAndTime(),
          };

          console.log(values);

          var sql =
            "SELECT *FROM `file_road_scrunity` WHERE `mst_file_id`=" +
            mst_file_id +
            " and `mst_type_id`=" +
            values?.mst_type_id +
            " and `is_rejected`=0";
          db.query(sql, (err, result) => {
            if (err) {
              console.log(err);
              res
                .status(200)
                .json({ message: err.sqlMessage, error: true, data: {} });
            } else if (result.length > 0) {
              //Update
              var sql =
                "UPDATE `file_road_scrunity` SET ? WHERE `mst_file_id`=" +
                mst_file_id +
                " and `mst_type_id`=" +
                values?.mst_type_id +
                " and `is_rejected`=0";

              delete values.created_at;
              delete values.created_by;
              delete values.mst_type_id;

              var updatedData = {
                ...values,
                documents: values?.documents
                  ? values?.documents
                  : result[0]?.documents
                  ? result[0]?.documents
                  : "",
                updated_by: req?.user?.id ? req?.user?.id : 0,
                updated_at: getCurrentDateAndTime(),
              };

              db.query(sql, updatedData, (err, result) => {
                if (err) {
                  console.log(err);
                  res
                    .status(200)
                    .json({ message: err.sqlMessage, error: true, data: {} });
                } else {
                }
              });
            } else {
              //Insert
              var sql = "INSERT INTO `file_road_scrunity` SET ?";
              db.query(sql, values, (err, xresult) => {
                if (err) {
                  console.log("Some error occured : " + err);
                  res
                    .status(200)
                    .json({ message: err.sqlMessage, error: true, data: {} });
                } else {
                }
              });
            }
          });
        }

        if (isSaveAndNext) {
          const fileData = await commonController.getMstFileByMstFileId(
            parseInt(mst_file_id)
          );
          /*Send Email*/
          await sendEmail({
            subject: "File stage Updated",
            html: fileStageEmailTemplate({
              file_name: fileData[0]?.file_name,
              from_stage: "Road Deposit/Scrunity Fees",
              to_stage: "Assistant/Junior Engineer",
              url: `${frontEndUrl.FileStageRouteUrl}/${mst_file_id}`,
            }),
          });

          commonController.updateMstFileStage(9, parseInt(mst_file_id));
          res
            .status(200)
            .json({
              message: "Changes saved!",
              error: false,
              data: { isNextStage: 1 },
            });
        } else {
          res
            .status(200)
            .json({
              message: "Changes saved!",
              error: false,
              data: { isNextStage: 0 },
            });
        }
      } else {
        paths.length ? unlinkMultipleImages(paths) : "";
        res
          .status(200)
          .json({ message: "Invalid request", error: true, data: {} });
      }
    } catch (err) {
      console.log(err);
      paths.length ? unlinkMultipleImages(paths) : "";
      res.status(200).json({ message: "Server error", error: true, data: {} });
    }
  },
  saveRoadDepositScrunity: (req, res) => {
    const allData = JSON.parse(JSON.stringify(req.body.data));
    const findErrors = [];
    const arr = [];

    console.log(req.files);

    for (let data of allData) {
      if (module.exports.validJson(data?.is_save)) {
        //Check save,sendMsg,next
        const action = JSON.stringify(data?.is_save);
        if (
          typeof action?.save != "undefined" &&
          typeof action?.send_msg != "undefined" &&
          typeof action?.next != "undefined"
        ) {
          if (parseInt(action?.save) === 1) {
            //No need to valid anything

            const schema1 = yup.object({
              mst_company_id: yup.number().required().positive().integer(),
              mst_file_id: yup.number().required().positive().integer(),
              amount: yup.number(),
              show_website: yup.number().min(0).max(1).required(),
            });

            const values = {
              mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
              mst_file_id: data?.mst_file_id,
              mst_type_id: data?.mst_type_id,
              amount:
                parseInt(data?.amount) != NaN ? parseFloat(data?.amount) : 0,
              show_website:
                (parseInt(data?.show_website) !== NaN &&
                  parseInt(data?.show_website) === 0) ||
                parseInt(data?.show_website) === 1
                  ? parseInt(data?.show_website)
                  : 0,
              documents: "",
              document_upload_date: data?.document_upload_date,
              is_save: module.exports.validJson(data?.is_save)
                ? data?.is_save
                : JSON.stringify({ save: 0, send_msg: 0, next: 0 }),
              is_rejected: 0,
              created_by: req?.user?.id ? req?.user?.id : 0,
              created_at: getCurrentDateAndTime(),
            };

            schema1.validate(values).catch((err) => {
              console.log(`${err}`);
              findErrors.push({
                error: true,
                message: "Unable to saved the changes",
              });
            });
          } else if (parseInt(action?.send_msg) === 1) {
            //Valid only if show_website is checked : amount is required, date and file are optional
            const schema2 = yup.object({
              mst_company_id: yup.number().required().positive().integer(),
              mst_file_id: yup.number().required().positive().integer(),
              amount: yup.number().required(),
              show_website: yup.number().min(0).max(1).required(),
            });

            const values = {
              mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
              mst_file_id: data?.mst_file_id,
              mst_type_id: data?.mst_type_id,
              amount:
                parseInt(data?.amount) != NaN ? parseFloat(data?.amount) : 0,
              show_website:
                (parseInt(data?.show_website) !== NaN &&
                  parseInt(data?.show_website) === 0) ||
                parseInt(data?.show_website) === 1
                  ? parseInt(data?.show_website)
                  : 0,
              documents: "",
              document_upload_date: data?.document_upload_date,
              is_save: module.exports.validJson(data?.is_save)
                ? data?.is_save
                : JSON.stringify({ save: 0, send_msg: 0, next: 0 }),
              is_rejected: 0,
              created_by: req?.user?.id ? req?.user?.id : 0,
              created_at: getCurrentDateAndTime(),
            };

            schema2.validate(values).catch((err) => {
              console.log(`${err}`);
              findErrors.push({
                error: true,
                message: "Unable to saved the changes",
              });
            });
          } else if (parseInt(action?.next) == 1) {
            //Valid only if show_website is checked : amount is required, date and file are also required
            const schema3 = yup.object({
              mst_company_id: yup.number().required().positive().integer(),
              mst_file_id: yup.number().required().positive().integer(),
              amount: yup.number().required(),
              show_website: yup.number().min(0).max(1).required(),
              documents: yup.string().required(),
            });

            const values = {
              mst_company_id: req?.user?.comp_id ? req?.user?.comp_id : 0,
              mst_file_id: data?.mst_file_id,
              mst_type_id: data?.mst_type_id,
              amount:
                parseInt(data?.amount) != NaN ? parseFloat(data?.amount) : 0,
              show_website:
                (parseInt(data?.show_website) !== NaN &&
                  parseInt(data?.show_website) === 0) ||
                parseInt(data?.show_website) === 1
                  ? parseInt(data?.show_website)
                  : 0,
              documents: "",
              document_upload_date: data?.document_upload_date,
              is_save: module.exports.validJson(data?.is_save)
                ? data?.is_save
                : JSON.stringify({ save: 0, send_msg: 0, next: 0 }),
              is_rejected: 0,
              created_by: req?.user?.id ? req?.user?.id : 0,
              created_at: getCurrentDateAndTime(),
            };

            schema3.validate(values).catch((err) => {
              console.log(`${err}`);
              findErrors.push({
                error: true,
                message: "Unable to saved the changes",
              });
            });
          } else {
            findErrors.push({ error: true, message: "Invalid action" });
          }
        } else {
          findErrors.push({ error: true, message: "Invalid action" });
        }
      } else {
        findErrors.push({ error: true, message: "Invalid action" });
      }
    }

    if (!findErrors.length) {
      //Perform operation
      res
        .status(200)
        .json({
          message: "Under the development stage",
          error: true,
          data: {},
        });
    } else {
      res
        .status(200)
        .json({ message: findErrors[0]?.message, error: true, data: {} });
    }
  },
};
