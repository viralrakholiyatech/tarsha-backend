const { frontEndUrl } = require("../../helpers/constants");
const {
  sendEmail,
  fileStageEmailTemplate,
} = require("../../services/MailService");
const { skipStagesMessage } = require("../../services/Utility");
const commonController = require("./commonController");
const notificationController = require("./notificationController");

module.exports = {
  fetch: (req, res) => {
    var sql =
      "SELECT *from `file_details` where mst_file_id=" +
      Number(req.params.id) + 
      "";
    db.query(sql, (err, result) => {
      if (err) {
        res
          .status(201)
          .json({ error: true, message: "Something went wrong...", data: {} });
      } else {
        if (result.length) {
          res
            .status(201)
            .json({
              error: false,
              message: "Record fetched...",
              data: result[0],
            });
        } else {
          res
            .status(201)
            .json({ error: true, message: "No record found", data: {} });
        }
      }
    });
  },

  updateMstFileStage: (mst_stage_id, mst_file_id) => {
    const sql =
      "UPDATE `mst_file` set `mst_stage_id`=" +
      parseInt(mst_stage_id) +
      " where `id`=" +
      parseInt(mst_file_id) +
      "";
    db.query(sql, (err, result) => {
      if (err) {
        console.log(err);
      }
    });
  },
  addoredit: async (req, res) => {
    req.assert("mst_file_id", "File id is required").notEmpty();
    //req.assert("mst_company_id","Company Id is required")0;
    req.assert("smc_case_app_id", "SMC Case APP Id is required").notEmpty();
    req.assert("village", "Village is required").notEmpty();
    req.assert("taluka", "Taluka is required").notEmpty();
    req.assert("district", "District is required").notEmpty();
    req.assert("rs_block_no", "rs_block_no is required").notEmpty();
    req.assert("rs_block_no_text", "rs_block_no_text is required").notEmpty();
    req.assert("tika_moje_no", "tika_moje_no is required").notEmpty();
    req.assert("tika_moje_no_text", "tika_moje_no_text is required").notEmpty();
    req.assert("ward_no", "ward_no is required").notEmpty();
    req.assert("cs_no", "cs_no is required").notEmpty();
    req.assert("tps_no", "tps_no is required").notEmpty();
    req.assert("tps_stage", "tps_stage is required").notEmpty();
    req.assert("op_no", "op_no is required").notEmpty();
    req.assert("fp_no", "fp_no is required").notEmpty();
    req.assert("subplot_no", "subplot_no is required").notEmpty();

    var errors = req.validationErrors();
    if (errors) {
      res.status(201).json({ error: true, message: errors[0].msg, data: {} });
    } else {

 
      const fileDate = new Date(req.body.date);
      console.log("req.body==>",req.body)
      const createdDate = new Date(getCurrentDateAndTime());
      console.log("createdDate-->",createdDate)
      
      // Calculate the difference in milliseconds between the two dates
      const timeDifference = Math.abs(createdDate - fileDate);
      console.log("timeDifference-->",timeDifference)
      
      // Convert the time difference from milliseconds to days
      const differenceInDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
      console.log("differenceInDays-->",differenceInDays)
      
      // Assign red or green card based on the condition
      let cardColor;
      if (differenceInDays <= 2) { 
        // If the difference is 0 or 1 days, give a green card
        cardColor = "green";
      } else if (differenceInDays > 2) {
        // If the difference is greater than 2 days, give a red card
        cardColor = "red";
      } else {
       
        cardColor = "red";
      }
      
      
      
   


      const user_id = req.user.id;
      var data = {
        mst_file_id: req.body.mst_file_id,
        office_file_no: req.body.office_file_no,
        land_detail: req.body.land_detail,
        hod: req.body.hod,
        team_id: req.body.team_id,
        google_location: req.body.google_location,
        remark_by_assign_to: req.body.remark_by_assign_to,
        remark_by_hod: req.body.remark_by_hod,
        approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
        mst_company_id: 1,
        smc_case_app_id: req.body.smc_case_app_id,
        village: req.body.village,
        taluka: req.body.taluka,
        district: req.body.district,
        rs_block_no: req.body.rs_block_no,
        rs_block_no_text: req.body.rs_block_no_text,
        tika_moje_no: req.body.tika_moje_no,
        tika_moje_no_text: req.body.tika_moje_no_text,
        ward_no: req.body.ward_no,
        cs_no: req.body.cs_no,
        tps_no: req.body.tps_no,
        tps_stage:
          parseInt(req.body.tps_stage) == 1 ||
          parseInt(req.body.tps_stage) == 2 ||
          parseInt(req.body.tps_stage) == 3
            ? parseInt(req.body.tps_stage)
            : 1,
        op_no: req.body.op_no,
        fp_no: req.body.fp_no,
        subplot_no: req.body.subplot_no,
        is_save:
          parseInt(req?.body?.is_save) == 0 || parseInt(req?.body?.is_save) == 1
            ? parseInt(req.body.is_save)
            : 0,
        created_by: user_id,
        created_at: getCurrentDateAndTime(),  
        updated_at: null,
        updated_by: null,
       card:cardColor,
     
      };
     
  
     
      var stageName = "";
      try {
        const stage = await commonController.getStageStageId(1);
        stageName = stage[0]?.title;
      } catch (err) {
        console.log(err);
      }

      var sql =
        "SELECT *from `file_details` where `mst_file_id`=" +
        Number(data.mst_file_id) +
        "";
      db.query(sql, (err, result) => {
        if (err) {
          res
            .status(201)
            .json({ error: true, message: err.sqlMessage, data: {} });
        } else {
          if (result.length) {
            const updatedData = {
              mst_company_id: data?.mst_company_id,
              smc_case_app_id: data?.smc_case_app_id,
              office_file_no: req.body.office_file_no,
              team_id: req.body.team_id,
              google_location: req.body.google_location,
              remark_by_assign_to: req.body.remark_by_assign_to,
              remark_by_hod: req.body.remark_by_hod,
              approved_by_hod: req.body.approved_by_hod === "Yes" ? 1 : 0,
              village: req.body.village,
              taluka: req.body.taluka,
              district: req.body.district,
              rs_block_no: req.body.rs_block_no,
              rs_block_no_text: req.body.rs_block_no_text,
              tika_moje_no: req.body.tika_moje_no,
              tika_moje_no_text: req.body.tika_moje_no_text,
              ward_no: req.body.ward_no,
              cs_no: req.body.cs_no,
              tps_no: req.body.tps_no,
              tps_stage:
                parseInt(req.body.tps_stage) == 1 ||
                parseInt(req.body.tps_stage) == 2 ||
                parseInt(req.body.tps_stage) == 3
                  ? parseInt(req.body.tps_stage)
                  : 1,
              op_no: req.body.op_no,
              fp_no: req.body.fp_no,
              subplot_no: req.body.subplot_no,
              is_save:
                parseInt(req?.body?.is_save) == 0 ||
                parseInt(req?.body?.is_save) == 1
                  ? parseInt(req.body.is_save)
                  : 0,
              updated_by: user_id,
              updated_at: getCurrentDateAndTime(),
              card: req.body.card ? req.body.card : cardColor
            };

            console.log("123Data===>",updatedData)
            if (!updatedData?.is_save) {
              delete updatedData.is_save;
            }

            var sql =
              "UPDATE `file_details` SET ? WHERE  mst_file_id=" +
              req.body.mst_file_id +
              "";

            // var sql = "UPDATE `file_details` SET `mst_company_id`="+data.mst_company_id+",`smc_case_app_id`='"+data.smc_case_app_id+"',`village`='"+data.village+"',taluka='"+data.taluka+"',district='"+data.district+"',rs_block_no='"+data.rs_block_no+"',rs_block_no_text='"+data.rs_block_no_text+"',tika_moje_no='"+data.tika_moje_no+"',tika_moje_no_text='"+data.tika_moje_no_text+"',ward_no='"+data.ward_no+"',cs_no='"+data.cs_no+"',tps_no='"+data.tps_no+"',tps_stage='"+data.tps_stage+"',op_no='"+data.op_no+"',fp_no='"+data.fp_no+"',subplot_no='"+data.subplot_no+"',`is_save`="+parseInt(data.is_save)+",updated_by="+data.created_by+",updated_at='"+getCurrentDateAndTime()+"' where mst_file_id="+data.mst_file_id+"";
            db.query(sql, updatedData, async (err, result) => {
              if (err) {
                // console.log(sql);
                console.log(err);
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                if (parseInt(data?.is_save) === 1) {
                  commonController.updateMstFileStage(2, data.mst_file_id);

                  try {
                    const fileData =
                      await commonController.getMstFileByMstFileId(
                        parseInt(req.body?.mst_file_id)
                      );
                    if (fileData.length > 0) {
                      /*Sending Notification*/
                      // notificationController.setNotification
                      // (
                      //     JSON.stringify({message:`${stageName} has been updated on ${fileData[0]?.file_name} by`}),
                      //     fileData[0]?.cus_id,
                      //     parseInt(req?.user?.id),
                      //     parseInt(data?.mst_file_id),
                      //     fileData[0]?.cus_id
                      // );

                      /*Send Email*/
                      sendEmail({
                        subject: "File stage Updated",
                        html: fileStageEmailTemplate({
                          file_name: fileData[0]?.file_name,
                          from_stage: "File Details",
                          to_stage: "Required Document List",
                          url: `${frontEndUrl.FileStageRouteUrl}/${req.body?.mst_file_id}`,
                        }),
                      });
                    }
                  } catch (err) {
                    console.log(err);
                  }
                }

                res
                  .status(201)
                  .json({ error: false, message: "Changes saved", data: {} });
              }
            });
          } else {
            var sql = "INSERT INTO `file_details` SET ?";
            db.query(sql, data, async (err, result) => {
              if (err) {
                res
                  .status(201)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                if (parseInt(data?.is_save) === 1) {
                  commonController.updateMstFileStage(2, data.mst_file_id);
                  try {
                    const fileData =
                      await commonController.getMstFileByMstFileId(
                        parseInt(req.body?.mst_file_id)
                      );
                    if (fileData.length > 0) {
                      /*Sending Notification*/
                      // notificationController.setNotification
                      // (
                      //     JSON.stringify({message:`${stageName} has been updated on ${fileData[0]?.file_name} by`}),
                      //     fileData[0]?.cus_id,
                      //     parseInt(req?.user?.id),
                      //     parseInt(data?.mst_file_id),
                      //     fileData[0]?.cus_id
                      // );

                      sendEmail({
                        subject: "File stage Updated",
                        html: fileStageEmailTemplate({
                          file_name: fileData[0]?.file_name,
                          from_stage: "File Details",
                          to_stage: "Required Document List",
                          url: `${frontEndUrl.FileStageRouteUrl}/${req.body?.mst_file_id}`,
                        }),
                      });
                    }
                  } catch (err) {
                    console.log(err);
                  }
                }
                res
                  .status(201)
                  .json({ error: false, message: "Changes saved", data: {} });
              }
            });
          }
        }
      });
    }
  },
  skipFileDetails: (req, res) => {
    try {
      req.assert("mst_file_id", "File id is required").notEmpty();
      req.assert("tps_stage", "Tps stage is required").notEmpty();

      var errors = req.validationErrors();

      if (errors) {
        res.status(200).json({ error: true, message: errors[0].msg, data: {} });
      } else {
        var sql =
          "SELECT *from `file_details` WHERE `mst_file_id`=" +
          req.body?.mst_file_id +
          "";

        db.query(sql, (err, result) => {
          if (err) {
            res
              .status(200)
              .json({ error: true, message: err.sqlMessage, data: {} });
          } else if (result.length > 0) {
            var moveToNext = 0;

            let data = {
              tps_stage: req.body.tps_stage,
              is_skip: 1,
              is_save: 1,
              updated_at: getCurrentDateAndTime(),
              updated_by: req?.user?.id,
            };

            if (result[0]?.is_skip == 1) {
              delete data.is_skip;
              delete data.is_save;
            }

            var sql =
              "UPDATE `file_details` SET ? WHERE `mst_file_id`=" +
              req.body?.mst_file_id +
              "";

            db.query(sql, data, (err, result) => {
              if (err) {
                res
                  .status(200)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                if (data?.is_save == 1) {
                  commonController.updateMstFileStage(
                    2,
                    req?.body?.mst_file_id
                  );
                }

                res
                  .status(200)
                  .json({
                    message: skipStagesMessage(),
                    data: {},
                    error: false,
                  });
              }
            });
          } else {
            var sql = "INSERT INTO `file_details` SET ?";

            let data = {
              mst_file_id: req?.body?.mst_file_id,
              mst_company_id: req?.user?.comp_id,
              tps_stage: req.body.tps_stage,
              is_skip: 1,
              is_save: 1,
              created_at: getCurrentDateAndTime(),
              created_by: req?.user?.id,
            };

            db.query(sql, data, (err, result) => {
              if (err) {
                res
                  .status(200)
                  .json({ error: true, message: err.sqlMessage, data: {} });
              } else {
                commonController.updateMstFileStage(2, req?.body?.mst_file_id);
                res
                  .status(200)
                  .json({
                    message: skipStagesMessage(),
                    data: {},
                    error: false,
                  });
              }
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
      res.status(200).json({ message: "Server error", data: {}, error: false });
    }
  },
};
